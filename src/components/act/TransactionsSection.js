import Section from '../layout/Section.js';
import Button from '../form/Button.js';
import TransactionModal from './TransactionModal.js';
import { EmptyState } from '../display/index.js';
import { colorConversion, formatCurrency, confirmWithSound } from '../../utils/index.js';
import CfgColorPalette from '../../design-system/tokens/CfgColorPalette.js';
import eventBus from '../../system/core/EventBus.js';

const { hexToRgba, getTransactionTypeColor, getIconBackgroundOpacity, applyIconBackground } = colorConversion;
const { formatTransactionAmount } = formatCurrency;

class TransactionsSection {
  constructor(date) {
    // Получаем выбранную дату из глобального состояния
    const selectedDateState = window.selectedDateState;
    if (selectedDateState) {
      this.date = date || selectedDateState.getSelectedDateString();
    } else {
      this.date = date || this.getCurrentDate();
    }
    
    const getDB = window.getDB;
    if (!getDB) {
      console.error('[TransactionsSection] База данных недоступна');
      this.db = null;
    } else {
      this.db = getDB();
      if (!this.db) {
        console.error('[TransactionsSection] База данных не инициализирована');
      }
    }
    this.element = null;
    this.transactions = [];
    this.section = null;
    this.unsubscribe = null; // Функция для отписки от изменений даты
    this.currencyUnsubscribe = null; // Функция для отписки от изменений валюты
    this.eventUnsubscribes = []; // Массив функций отписки от событий
    this.isRendering = false; // Флаг для предотвращения одновременных вызовов render()
  }

  getCurrentDate() {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  async init() {
    // Создаем кнопку добавления
    const addButton = new Button({
      iconName: 'plus'
    });
    await addButton.init();
    addButton.element.className = 'btn btn-icon';
    // Убеждаемся, что кнопка не растягивается и не выходит за границы
    addButton.element.style.flexShrink = '0';
    addButton.element.style.width = 'var(--height-control)';
    addButton.element.style.minWidth = 'var(--height-control)';
    addButton.element.style.maxWidth = 'var(--height-control)';
    addButton.element.addEventListener('click', async () => {
      // Получаем актуальную выбранную дату
      const selectedDateState = window.selectedDateState;
      const currentDate = selectedDateState ? selectedDateState.getSelectedDateString() : this.date;
      await TransactionModal.open(currentDate, async (transactionData) => {
        await this.addTransaction(transactionData);
      });
    });
    
    // Создаем секцию с заголовком и кнопкой
    this.section = new Section({ 
      title: 'Финансы',
      titleActions: addButton.element
    });
    this.element = this.section.render();
    
    // Инициализируем метки расходов и доходов
    this.updateFinanceBadges();
    
    // Подписываемся на изменения выбранной даты
    const selectedDateState = window.selectedDateState;
    if (selectedDateState) {
      this.unsubscribe = selectedDateState.subscribe(async (date, dateString) => {
        this.date = dateString;
        await this.loadTransactions();
        await this.render();
      });
    }
    
    // Подписываемся на изменения валюты
    const handleCurrencyChange = async () => {
      const { resetCurrencyCache } = formatCurrency;
      resetCurrencyCache();
      // Перерисовываем транзакции с новой валютой
      await this.render();
    };
    window.addEventListener('currency-changed', handleCurrencyChange);
    this.currencyUnsubscribe = () => {
      window.removeEventListener('currency-changed', handleCurrencyChange);
    };
    
    // Загружаем транзакции
    await this.loadTransactions();
    
    // Создаем контент
    await this.render();

    // Подписываемся на события обновления транзакций
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Подписка на добавление транзакций
    const unsubscribeTransactionAdded = eventBus.on('transactionAdded', async (detail) => {
      const eventDate = detail.date || (detail.data && detail.data.date);
      if (eventDate && eventDate !== this.date) {
        return; // Игнорируем изменения для других дат
      }
      await this.loadTransactions();
      await this.render();
    });
    this.eventUnsubscribes.push(unsubscribeTransactionAdded);

    // Подписка на изменение транзакций
    const unsubscribeTransactionChanged = eventBus.on('transactionChanged', async (detail) => {
      const eventDate = detail.date || (detail.data && detail.data.date);
      if (eventDate && eventDate !== this.date) {
        return;
      }
      
      // Если есть ID транзакции - обновляем только её
      const transactionId = detail.data?.id || detail.transactionId;
      if (transactionId) {
        await this.updateTransactionCard(transactionId);
      } else {
        await this.loadTransactions();
        await this.render();
      }
    });
    this.eventUnsubscribes.push(unsubscribeTransactionChanged);

    // Подписка на удаление транзакций
    const unsubscribeTransactionDeleted = eventBus.on('transactionDeleted', async (detail) => {
      const eventDate = detail.date || (detail.data && detail.data.date);
      if (eventDate && eventDate !== this.date) {
        return;
      }
      await this.loadTransactions();
      await this.render();
    });
    this.eventUnsubscribes.push(unsubscribeTransactionDeleted);
  }

  /**
   * Обновить карточку транзакции по ID
   */
  async updateTransactionCard(transactionId) {
    if (!this.db || !this.element) return;

    // Находим транзакцию
    const transaction = this.transactions.find(t => t.id === transactionId);
    if (!transaction) {
      await this.loadTransactions();
      await this.render();
      return;
    }

    // Находим карточку в DOM
    const card = this.element.querySelector(`[data-transaction-id="${transactionId}"]`);
    if (!card) {
      await this.loadTransactions();
      await this.render();
      return;
    }

    // Пересоздаем карточку с обновленными данными
    const newCard = await this.createTransactionCard(transaction);
    card.replaceWith(newCard);
  }

  /**
   * Вычисляет сумму доходов за текущую дату
   * @returns {number} Сумма доходов
   */
  calculateIncome() {
    if (!this.db || !this.transactions) return 0;
    
    return this.transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }

  /**
   * Вычисляет сумму расходов за текущую дату
   * @returns {number} Сумма расходов
   */
  calculateExpense() {
    if (!this.db || !this.transactions) return 0;
    
    return this.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
  }

  /**
   * Обновляет метки расходов и доходов в заголовке секции
   */
  updateFinanceBadges() {
    if (!this.section) return;
    
    const income = this.calculateIncome();
    const expense = this.calculateExpense();
    
    const { formatBalance } = formatCurrency;
    const incomeFormatted = formatBalance(income);
    const expenseFormatted = formatBalance(expense);
    
    this.section.updateBadges([
      { text: 'Расходы:', value: expenseFormatted },
      { text: 'Доходы:', value: incomeFormatted }
    ]);
  }

  async loadTransactions() {
    try {
      if (!this.db) {
        console.warn('[TransactionsSection] База данных недоступна для загрузки транзакций');
        this.transactions = [];
        return;
      }
      
      // Получаем актуальную выбранную дату
      const selectedDateState = window.selectedDateState;
      const dateToLoad = selectedDateState ? selectedDateState.getSelectedDateString() : this.date;
      
      this.transactions = this.db.getTransactions(dateToLoad);
      this.date = dateToLoad; // Обновляем текущую дату
      
      console.log(`[TransactionsSection] Загружено транзакций за ${dateToLoad}:`, this.transactions.length);
      if (this.transactions.length > 0) {
        console.log('[TransactionsSection] Первая транзакция:', this.transactions[0]);
      }
      
      // Обновляем метки после загрузки транзакций
      this.updateFinanceBadges();
    } catch (error) {
      console.error('[TransactionsSection] Ошибка загрузки транзакций:', error);
      this.transactions = [];
      this.updateFinanceBadges();
    }
  }

  async addTransaction(transactionData) {
    try {
      // Получаем актуальную выбранную дату
      const selectedDateState = window.selectedDateState;
      const currentDate = selectedDateState ? selectedDateState.getSelectedDateString() : this.date;
      
      // Генерируем ID
      const id = `txn_${currentDate.replace(/-/g, '')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Добавляем метаданные
      const transaction = {
        id: id,
        date: currentDate,
        ...transactionData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('[TransactionsSection] Добавление транзакции:', transaction);
      
      // Сохраняем транзакцию напрямую в таблицу
      this.db.addTransaction(transaction);
      
      // Обновляем балансы счетов
      await this.updateAccountBalances(transaction);
      
      // Небольшая задержка для гарантии, что данные сохранены в БД
      setTimeout(() => {
        // Отправляем событие через EventBus с деталями ПОСЛЕ сохранения
        // Обработчик события обновит отображение, поэтому не вызываем render() здесь
        eventBus.emit('transactionAdded', {
          action: 'create',
          data: transaction,
          affectedIds: [transaction.id],
          date: transaction.date
        });
      }, 0);
      
      return transaction;
    } catch (error) {
      console.error('[TransactionsSection] Ошибка добавления транзакции:', error);
      throw error;
    }
  }

  async updateTransaction(transactionId, transactionData) {
    try {
      // Получаем текущую транзакцию
      const currentTransaction = this.db.getTransactionById(transactionId);
      if (!currentTransaction) {
        throw new Error('Транзакция не найдена');
      }
      
      // Обновляем транзакцию
      const updatedTransaction = {
        ...transactionData,
        updated_at: new Date().toISOString()
      };
      
      this.db.updateTransaction(transactionId, updatedTransaction);
      
      // Обновляем балансы счетов (откатываем старую транзакцию и применяем новую)
      await this.revertAccountBalances(currentTransaction);
      await this.updateAccountBalances({ ...updatedTransaction, id: transactionId, date: currentTransaction.date });
      
      // Формируем полные данные обновленной транзакции
      const fullUpdatedTransaction = {
        ...currentTransaction,
        ...updatedTransaction,
        id: transactionId,
        date: currentTransaction.date
      };
      
      // Небольшая задержка для гарантии, что данные сохранены в БД
      setTimeout(() => {
        // Отправляем событие через EventBus с деталями ПОСЛЕ сохранения
        // Обработчик события обновит отображение, поэтому не вызываем render() здесь
        eventBus.emit('transactionChanged', {
          action: 'update',
          data: fullUpdatedTransaction,
          previousData: currentTransaction,
          affectedIds: [transactionId],
          date: currentTransaction.date
        });
      }, 0);
      
      return updatedTransaction;
    } catch (error) {
      console.error('[TransactionsSection] Ошибка обновления транзакции:', error);
      throw error;
    }
  }

  async revertAccountBalances(transaction) {
    const db = this.db;
    
    if (transaction.type === 'transfer') {
      // Откатываем перевод: увеличиваем баланс from_id, уменьшаем to_id
      const fromAccount = db.getById('cfg_accounts', transaction.from_id);
      const toAccount = db.getById('cfg_accounts', transaction.to_id);
      
      if (fromAccount && toAccount) {
        db.update('cfg_accounts', transaction.from_id, {
          balance: (fromAccount.balance || 0) + transaction.amount
        });
        db.update('cfg_accounts', transaction.to_id, {
          balance: (toAccount.balance || 0) - transaction.amount
        });
      }
    } else if (transaction.type === 'income') {
      // Откатываем доход: уменьшаем баланс счета
      const account = db.getById('cfg_accounts', transaction.account_id);
      if (account) {
        db.update('cfg_accounts', transaction.account_id, {
          balance: (account.balance || 0) - transaction.amount
        });
      }
    } else if (transaction.type === 'expense') {
      // Откатываем расход: увеличиваем баланс счета
      const account = db.getById('cfg_accounts', transaction.account_id);
      if (account) {
        db.update('cfg_accounts', transaction.account_id, {
          balance: (account.balance || 0) + transaction.amount
        });
      }
    }
  }

  async updateAccountBalances(transaction) {
    const db = this.db;
    
    if (transaction.type === 'transfer') {
      // Перевод: уменьшаем баланс from_id, увеличиваем to_id
      const fromAccount = db.getById('cfg_accounts', transaction.from_id);
      const toAccount = db.getById('cfg_accounts', transaction.to_id);
      
      if (fromAccount && toAccount) {
        db.update('cfg_accounts', transaction.from_id, {
          balance: (fromAccount.balance || 0) - transaction.amount
        });
        db.update('cfg_accounts', transaction.to_id, {
          balance: (toAccount.balance || 0) + transaction.amount
        });
      }
    } else if (transaction.type === 'income') {
      // Доход: увеличиваем баланс
      const account = db.getById('cfg_accounts', transaction.account_id);
      if (account) {
        db.update('cfg_accounts', transaction.account_id, {
          balance: (account.balance || 0) + transaction.amount
        });
      }
    } else if (transaction.type === 'expense') {
      // Расход: уменьшаем баланс
      const account = db.getById('cfg_accounts', transaction.account_id);
      if (account) {
        db.update('cfg_accounts', transaction.account_id, {
          balance: (account.balance || 0) - transaction.amount
        });
      }
    }
  }

  async render() {
    // Защита от одновременных вызовов
    if (this.isRendering) {
      return;
    }
    
    this.isRendering = true;
    
    try {
      // Находим или создаем контейнер списка
      let list = this.element.querySelector('.act-list');
      let listItems = list ? list.querySelector('.act-list-items') : null;
      
      if (!list) {
        // Создаем список в стиле act-list только если его нет
        list = document.createElement('div');
        list.className = 'act-list';
        this.element.appendChild(list);
      }
      
      if (!listItems) {
        // Создаем контейнер для элементов только если его нет
        listItems = document.createElement('div');
        listItems.className = 'act-list-items';
        list.appendChild(listItems);
      } else {
        // Очищаем только содержимое контейнера, не удаляя сам контейнер
        listItems.innerHTML = '';
      }
      
      if (this.transactions.length === 0) {
        const emptyState = new EmptyState({ type: 'transactions' });
        await emptyState.init();
        listItems.appendChild(emptyState.render());
      } else {
        // Создаем карточки для каждой транзакции
        for (const transaction of this.transactions) {
          const card = await this.createTransactionCard(transaction);
          listItems.appendChild(card);
        }
      }
      
      // Обновляем метки после рендера
      this.updateFinanceBadges();
    } finally {
      this.isRendering = false;
    }
  }

  async createTransactionCard(transaction) {
    const card = document.createElement('div');
    card.className = 'act-card';
    card.style.cursor = 'pointer';
    card.dataset.transactionId = transaction.id; // Добавляем data-атрибут для быстрого поиска
    
    // Получаем данные для иконки и цвета
    const iconData = this.getIconAndColor(transaction);
    const categoryIcon = iconData.icon;
    const categoryColor = iconData.color;
    
    // Иконка слева (цветная)
    const iconWrapper = document.createElement('span');
    iconWrapper.className = 'act-card-icon has-color';
    
    // Применяем фон с учетом темы иконок
    applyIconBackground(iconWrapper, categoryColor);
    
    // Загружаем иконку
    if (categoryIcon) {
      try {
        const { iconLoader } = await import('../../utils/index.js');
        const iconContent = await iconLoader.loadIcon(categoryIcon);
        iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
      } catch (e) {
        // Дефолтная иконка
        iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
      }
    } else {
      // Дефолтная иконка
      iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
    }
    
    card.appendChild(iconWrapper);
    
    // Контент карточки - в одну строку
    const content = document.createElement('div');
    content.className = 'act-card-content';
    
    // Название категории/счета слева
    const titleWrapper = document.createElement('span');
    titleWrapper.className = 'act-card-title';
    titleWrapper.style.display = 'inline-flex';
    titleWrapper.style.alignItems = 'center';
    titleWrapper.style.gap = '4px';
    
    let titleText = '';
    let isImpulsive = false;
    if (transaction.type === 'transfer') {
      const toAccount = this.db.getById('cfg_accounts', transaction.to_id);
      titleText = toAccount ? toAccount.title : 'Перевод';
    } else {
      titleText = this.getCategoryName(transaction) || 'Без категории';
      const category = (transaction.type === 'expense' && transaction.category_id)
        ? this.db.getById('cfg_expense_categories', transaction.category_id)
        : null;
      isImpulsive = transaction.type === 'expense' && category?.type === 'compulsive';
    }
    
    if (isImpulsive) {
      try {
        const { iconLoader } = await import('../../utils/index.js');
        const frownIcon = await iconLoader.loadIcon('frown');
        const iconSpan = document.createElement('span');
        iconSpan.className = 'act-card-impulsive-icon';
        iconSpan.style.cssText = 'display: inline-flex; flex-shrink: 0; width: 14px; height: 14px; opacity: 0.8; color: var(--color-on-surface-secondary);';
        iconSpan.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%;">${frownIcon}</svg>`;
        titleWrapper.appendChild(iconSpan);
      } catch (e) {
        console.warn('[TransactionsSection] Не удалось загрузить иконку impulsive:', e);
      }
    }
    titleWrapper.appendChild(document.createTextNode(titleText));
    content.appendChild(titleWrapper);
    
    // Сумма справа - используем цвет типа транзакции
    const amountItem = document.createElement('span');
    amountItem.className = 'act-card-data-item';
    const sign = transaction.type === 'income' ? '+' : '-';
    const formattedAmount = formatTransactionAmount(transaction.amount);
    amountItem.textContent = `${sign}${formattedAmount}`;
    amountItem.style.fontWeight = 'var(--font-medium)';
    content.appendChild(amountItem);
    
    card.appendChild(content);
    
    // Действия (кнопка удаления)
    const actions = document.createElement('div');
    actions.className = 'act-card-actions';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-icon';
    deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const confirmed = await confirmWithSound('Удалить транзакцию?');
      if (confirmed) {
        await this.deleteTransaction(transaction.id);
      }
    });
    actions.appendChild(deleteBtn);
    
    card.appendChild(actions);
    
    // Обработчик клика на карточку для редактирования
    card.addEventListener('click', async (e) => {
      // Игнорируем клики на кнопку удаления
      if (e.target.closest('.act-card-actions')) {
        return;
      }
      
      // Открываем модальное окно редактирования
      const { default: TransactionModal } = await import('./TransactionModal.js');
      await TransactionModal.openForEdit(transaction, async (transactionId, transactionData) => {
        await this.updateTransaction(transactionId, transactionData);
      });
    });
    
    return card;
  }

  getCategory(transaction) {
    if (transaction.type === 'transfer' || !transaction.category_id) {
      return null;
    }
    
    const db = this.db;
    const tableName = transaction.type === 'income' 
      ? 'cfg_income_categories' 
      : 'cfg_expense_categories';
    
    const category = db.getById(tableName, transaction.category_id);
    
    if (!category) {
      // Отладочная информация
      const allCategories = db.getAll(tableName);
      console.warn(`[TransactionsSection] Категория не найдена:`, {
        category_id: transaction.category_id,
        type: transaction.type,
        table: tableName,
        available_categories_count: allCategories.length,
        available_categories: allCategories.map(c => ({ id: c.id, title: c.title }))
      });
      
      // Если категория не найдена, пытаемся найти первую доступную категорию того же типа
      // Это временное решение для случаев, когда ID категории изменился после перезагрузки пресетов
      if (allCategories.length > 0) {
        console.warn(`[TransactionsSection] Используем первую доступную категорию как замену`);
        return allCategories[0];
      }
    }
    
    return category;
  }

  getIconAndColor(transaction) {
    if (!this.db) {
      console.warn('[TransactionsSection] База данных недоступна для получения иконки и цвета');
      return {
        icon: null,
        color: getTransactionTypeColor(transaction.type)
      };
    }
    
    const db = this.db;
    
    // Для переводов - берем иконку и цвет из счета получателя
    if (transaction.type === 'transfer' && transaction.to_id) {
      const toAccount = db.getById('cfg_accounts', transaction.to_id);
      if (toAccount) {
        const accountColor = toAccount.color 
          ? CfgColorPalette.normalizeColor('finance-accounts', toAccount.color)
          : getTransactionTypeColor('transfer');
        return {
          icon: toAccount.icon || null,
          color: accountColor
        };
      }
    }
    
    // Для доходов/расходов - берем из категории
    if (transaction.category_id) {
      const category = this.getCategory(transaction);
      if (category) {
        const cfgType = transaction.type === 'income' ? 'finance-income' : 'finance-expense';
        const categoryColor = category.color 
          ? CfgColorPalette.normalizeColor(cfgType, category.color)
          : getTransactionTypeColor(transaction.type);
        return {
          icon: category.icon || null,
          color: categoryColor
        };
      } else {
        console.warn('[TransactionsSection] Категория не найдена для category_id:', transaction.category_id, 'тип:', transaction.type);
      }
    } else {
      console.warn('[TransactionsSection] Транзакция без category_id:', transaction);
    }
    
    // Дефолтные значения - используем токены цветов типов транзакций
    return {
      icon: null,
      color: getTransactionTypeColor(transaction.type)
    };
  }

  async deleteTransaction(transactionId) {
    try {
      // Находим транзакцию для отката балансов
      const transaction = this.transactions.find(t => t.id === transactionId);
      const transactionDate = transaction?.date || this.date;
      
      // Удаляем транзакцию
      this.db.deleteTransaction(transactionId);
      
      // Откатываем балансы (обратная операция)
      if (transaction) {
        await this.rollbackAccountBalances(transaction);
      }
      
      // Небольшая задержка для гарантии, что данные удалены из БД
      setTimeout(() => {
        // Отправляем событие через EventBus с деталями ПОСЛЕ удаления
        // Обработчик события обновит отображение, поэтому не вызываем render() здесь
        eventBus.emit('transactionDeleted', {
          action: 'delete',
          data: transaction || { id: transactionId },
          affectedIds: [transactionId],
          date: transactionDate
        });
      }, 0);
    } catch (error) {
      console.error('[TransactionsSection] Ошибка удаления транзакции:', error);
      throw error;
    }
  }

  async rollbackAccountBalances(transaction) {
    const db = this.db;
    
    if (transaction.type === 'transfer') {
      // Откат перевода: возвращаем деньги обратно
      const fromAccount = db.getById('cfg_accounts', transaction.from_id);
      const toAccount = db.getById('cfg_accounts', transaction.to_id);
      
      if (fromAccount && toAccount) {
        db.update('cfg_accounts', transaction.from_id, {
          balance: (fromAccount.balance || 0) + transaction.amount
        });
        db.update('cfg_accounts', transaction.to_id, {
          balance: (toAccount.balance || 0) - transaction.amount
        });
      }
    } else if (transaction.type === 'income') {
      // Откат дохода: уменьшаем баланс
      const account = db.getById('cfg_accounts', transaction.account_id);
      if (account) {
        db.update('cfg_accounts', transaction.account_id, {
          balance: (account.balance || 0) - transaction.amount
        });
      }
    } else if (transaction.type === 'expense') {
      // Откат расхода: увеличиваем баланс
      const account = db.getById('cfg_accounts', transaction.account_id);
      if (account) {
        db.update('cfg_accounts', transaction.account_id, {
          balance: (account.balance || 0) + transaction.amount
        });
      }
    }
  }

  getCategoryName(transaction) {
    if (transaction.type === 'transfer') {
      return 'Перевод';
    }
    
    const db = this.db;
    const categoryId = transaction.category_id;
    if (!categoryId) return '';
    
    const category = transaction.type === 'income' 
      ? db.getById('cfg_income_categories', categoryId)
      : db.getById('cfg_expense_categories', categoryId);
    
    return category ? category.title : '';
  }
}

export default TransactionsSection;
