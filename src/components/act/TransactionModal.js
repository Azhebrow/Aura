import { Modal } from '../layout/index.js';
import Button from '../form/Button.js';
import InputSuffix from '../../composites/InputSuffix.js';
import { iconLoader, formatCurrency } from '../../utils/index.js';

const { getCurrency } = formatCurrency;

class TransactionModal {
  static async open(date, onSave) {
    const getDB = window.getDB;
    if (!getDB) {
      console.error('[TransactionModal] База данных недоступна');
      return;
    }
    const db = getDB();
    if (!db) {
      console.error('[TransactionModal] База данных не инициализирована');
      return;
    }
    
    const accounts = db.getAll('cfg_accounts');
    const incomeCategories = db.getAll('cfg_income_categories').sort((a, b) => {
      const countA = a.usage_count || 0;
      const countB = b.usage_count || 0;
      return countB - countA;
    });
    const expenseCategories = db.getAll('cfg_expense_categories').sort((a, b) => {
      const countA = a.usage_count || 0;
      const countB = b.usage_count || 0;
      return countB - countA;
    });
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    
    const content = document.createElement('div');
    content.className = 'modal-content transaction-modal-content';
    
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
      <h3 class="modal-title">Добавить транзакцию</h3>
      <button class="modal-close">×</button>
    `;
    content.appendChild(header);
    
    const body = document.createElement('div');
    body.className = 'modal-body';
    
    const inner = document.createElement('div');
    inner.className = 'transaction-modal-inner';
    
    const formState = {
      type: 'expense',
      account_id: null,
      from_account_id: null,
      to_account_id: null,
      category_id: null,
      amount: null,
      searchQuery: ''
    };
    
    // === ТАБЫ С НАЗВАНИЯМИ ===
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'transaction-modal-tabs';
    
    const createTypeTab = async (typeValue, typeTitle, iconName) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'transaction-modal-tab';
      tab.dataset.type = typeValue;
      tab.title = typeTitle;
      
      if (typeValue === 'expense') {
        tab.classList.add('transaction-modal-tab-active');
      }
      
      try {
        const icon = await iconLoader.loadIcon(iconName);
        tab.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>
          <span class="transaction-modal-tab-label">${typeTitle}</span>
        `;
      } catch (e) {
        tab.textContent = typeTitle;
      }
      
      tab.addEventListener('click', async () => {
        tabsContainer.querySelectorAll('.transaction-modal-tab').forEach(t => t.classList.remove('transaction-modal-tab-active'));
        tab.classList.add('transaction-modal-tab-active');
        formState.type = typeValue;
        await updateCategoriesList();
        await updateAccountsDisplay();
        updateVisibility();
      });
      
      return tab;
    };
    
    const expenseTab = await createTypeTab('expense', 'Расход', 'arrow-down');
    const incomeTab = await createTypeTab('income', 'Доход', 'arrow-up');
    const transferTab = await createTypeTab('transfer', 'Перевод', 'arrow-left-right');
    
    tabsContainer.appendChild(expenseTab);
    tabsContainer.appendChild(incomeTab);
    tabsContainer.appendChild(transferTab);
    inner.appendChild(tabsContainer);
    
    // === СУММА (сначала, но видима внизу через CSS) ===
    const amountSection = document.createElement('div');
    amountSection.className = 'transaction-amount-section';
    
    const amountLabel = document.createElement('div');
    amountLabel.className = 'transaction-amount-label';
    amountLabel.textContent = 'Сумма';
    amountSection.appendChild(amountLabel);
    
    const currency = getCurrency();
    const amountInput = new InputSuffix({
      type: 'number',
      placeholder: '0.00',
      min: 0,
      step: 0.01,
      suffix: currency.symbol
    });
    await amountInput.init();
    const amountInputElement = amountInput.element.querySelector('input');
    amountInputElement.addEventListener('input', (e) => {
      formState.amount = parseFloat(e.target.value) || null;
    });
    amountSection.appendChild(amountInput.render());
    
    // === СПИСОК КАТЕГОРИЙ (БЕЗ ПОИСКА) ===
    const categoriesList = document.createElement('div');
    categoriesList.className = 'transaction-modal-list transaction-categories-list';
    
    const updateCategoriesList = async () => {
      categoriesList.innerHTML = '';
      
      if (formState.type === 'transfer') {
        const transferMessage = document.createElement('div');
        transferMessage.className = 'transaction-modal-list-empty';
        transferMessage.textContent = 'Выберите счета для перевода';
        categoriesList.appendChild(transferMessage);
        return;
      }
      
      const categories = formState.type === 'income' ? incomeCategories : expenseCategories;
      
      if (categories.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'transaction-modal-list-empty';
        emptyMessage.textContent = 'Нет категорий';
        categoriesList.appendChild(emptyMessage);
        formState.category_id = null;
        return;
      }
      
      for (const category of categories) {
        const row = document.createElement('button');
        row.className = 'transaction-category-row';
        row.type = 'button';
        row.dataset.categoryId = category.id;
        
        if (formState.category_id === category.id) {
          row.classList.add('is-selected');
        }
        
        // Иконка
        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'transaction-category-row-icon';
        if (category.icon) {
          try {
            const iconContent = await iconLoader.loadIcon(category.icon);
            iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
          } catch (e) {}
        }
        row.appendChild(iconWrapper);
        
        // Название с меткой
        const titleEl = document.createElement('div');
        titleEl.className = 'transaction-category-row-title';
        titleEl.textContent = category.title;
        
        if (category.type === 'compulsive') {
          const impulsiveLabel = document.createElement('span');
          impulsiveLabel.className = 'transaction-category-impulsive-label';
          impulsiveLabel.textContent = 'ИМПУЛЬС';
          titleEl.appendChild(impulsiveLabel);
        }
        
        row.appendChild(titleEl);
        
        row.addEventListener('click', () => {
          categoriesList.querySelectorAll('.transaction-category-row').forEach(r => r.classList.remove('is-selected'));
          row.classList.add('is-selected');
          formState.category_id = category.id;
          // Автофокус на сумму
          amountInputElement.focus();
          amountInputElement.select();
        });
        
        categoriesList.appendChild(row);
      }
      
      if (categories.length > 0 && !formState.category_id) {
        formState.category_id = categories[0].id;
        const firstRow = categoriesList.querySelector(`[data-category-id="${categories[0].id}"]`);
        if (firstRow) firstRow.classList.add('is-selected');
      }
    };
    
    inner.appendChild(categoriesList);
    
    // === СЧЕТА (одна строка, равномерное распределение) ===
    const accountsSection = document.createElement('div');
    accountsSection.className = 'transaction-accounts-section';
    
    const accountsContainer = document.createElement('div');
    accountsContainer.className = 'transaction-accounts-container';
    
    const createAccountButton = async (account, isSelected = false) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'transaction-account-btn';
      if (isSelected) btn.classList.add('active');
      
      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'transaction-account-btn-icon';
      if (account.icon) {
        try {
          const iconContent = await iconLoader.loadIcon(account.icon);
          iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconContent}</svg>`;
        } catch (e) {}
      }
      btn.appendChild(iconWrapper);
      
      const titleWrapper = document.createElement('div');
      titleWrapper.className = 'transaction-account-btn-title';
      titleWrapper.textContent = account.title;
      btn.appendChild(titleWrapper);
      
      return btn;
    };
    
    const updateAccountsDisplay = async () => {
      accountsContainer.innerHTML = '';
      
      if (accounts.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'transaction-modal-list-empty';
        emptyMessage.textContent = 'Нет счетов';
        accountsContainer.appendChild(emptyMessage);
        return;
      }
      
      if (formState.type === 'transfer') {
        // === ПЕРЕВОД: ДВЕ ВЕРТИКАЛЬНЫЕ СЕКЦИИ С СТРЕЛКОЙ ===
        
        // СЕКЦИЯ 1: ОТКУДА ПЕРЕВОДИТЬ
        const fromSection = document.createElement('div');
        fromSection.className = 'transaction-transfer-full-section';
        
        const fromLabel = document.createElement('div');
        fromLabel.className = 'transaction-accounts-label-inline';
        fromLabel.textContent = 'Откуда';
        fromSection.appendChild(fromLabel);
        
        const fromRow = document.createElement('div');
        fromRow.className = 'transaction-accounts-row';
        
        for (const account of accounts) {
          const btn = await createAccountButton(account, account.id === accounts[0].id);
          btn.addEventListener('click', () => {
            fromRow.querySelectorAll('.transaction-account-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            formState.from_account_id = account.id;
          });
          fromRow.appendChild(btn);
        }
        fromSection.appendChild(fromRow);
        accountsContainer.appendChild(fromSection);
        
        // СТРЕЛКА ПОСЕРЕДИНЕ
        const arrowWrapper = document.createElement('div');
        arrowWrapper.className = 'transaction-transfer-arrow';
        arrowWrapper.innerHTML = '→';
        accountsContainer.appendChild(arrowWrapper);
        
        // СЕКЦИЯ 2: КУДА ПЕРЕВОДИТЬ
        const toSection = document.createElement('div');
        toSection.className = 'transaction-transfer-full-section';
        
        const toLabel = document.createElement('div');
        toLabel.className = 'transaction-accounts-label-inline';
        toLabel.textContent = 'Куда';
        toSection.appendChild(toLabel);
        
        const toRow = document.createElement('div');
        toRow.className = 'transaction-accounts-row';
        
        for (const account of accounts) {
          const btn = await createAccountButton(account, account.id === (accounts[1]?.id || accounts[0].id));
          btn.addEventListener('click', () => {
            toRow.querySelectorAll('.transaction-account-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            formState.to_account_id = account.id;
          });
          toRow.appendChild(btn);
        }
        toSection.appendChild(toRow);
        accountsContainer.appendChild(toSection);
        
        if (accounts.length > 0) {
          formState.from_account_id = accounts[0].id;
          formState.to_account_id = accounts[1]?.id || accounts[0].id;
        }
      } else {
        // === ОБЫЧНЫЙ РЕЖИМ: ОДНА СТРОКА СЧЕТОВ ===
        const accountLabel = document.createElement('div');
        accountLabel.className = 'transaction-accounts-label-inline';
        accountLabel.textContent = 'Счет';
        accountsContainer.appendChild(accountLabel);
        
        const accountRow = document.createElement('div');
        accountRow.className = 'transaction-accounts-row';
        
        for (const account of accounts) {
          const btn = await createAccountButton(account, account.id === accounts[0].id);
          btn.addEventListener('click', () => {
            accountRow.querySelectorAll('.transaction-account-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            formState.account_id = account.id;
          });
          accountRow.appendChild(btn);
        }
        accountsContainer.appendChild(accountRow);
        
        if (accounts.length > 0) {
          formState.account_id = accounts[0].id;
        }
      }
    };
    
    accountsSection.appendChild(accountsContainer);
    inner.appendChild(accountsSection);
    
    // Добавляем сумму в конец
    inner.appendChild(amountSection);
    
    // Функция обновления видимости
    const updateVisibility = () => {
      categoriesList.style.display = formState.type === 'transfer' ? 'none' : 'flex';
    };
    
    // Инициализация
    await updateCategoriesList();
    await updateAccountsDisplay();
    updateVisibility();
    
    body.appendChild(inner);
    content.appendChild(body);
    
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    
    const cancelBtn = new Button({
      text: 'Отмена',
      variant: 'secondary'
    });
    await cancelBtn.init();
    cancelBtn.element.setAttribute('data-cancel-button', 'true');
    cancelBtn.element.addEventListener('click', () => {
      modalInstance.close();
      document.body.removeChild(modal);
    });
    footer.appendChild(cancelBtn.element);
    
    const saveBtn = new Button({
      text: 'Сохранить',
      variant: 'success'
    });
    await saveBtn.init();
    saveBtn.element.setAttribute('data-confirm-button', 'true');
    saveBtn.element.addEventListener('click', async () => {
      try {
        if (!formState.amount || formState.amount <= 0) {
          alert('Введите корректную сумму');
          return;
        }
        
        if (formState.type === 'transfer') {
          if (accounts.length < 2) {
            alert('Нужно минимум 2 счета для перевода');
            return;
          }
          if (!formState.from_account_id || !formState.to_account_id) {
            alert('Выберите оба счета');
            return;
          }
          if (formState.from_account_id === formState.to_account_id) {
            alert('Счета не могут совпадать');
            return;
          }
        } else {
          if (!formState.account_id) {
            alert('Выберите счет');
            return;
          }
          if (!formState.category_id) {
            alert('Выберите категорию');
            return;
          }
        }
        
        const transactionData = {
          type: formState.type,
          amount: formState.amount,
          description: null
        };
        
        if (formState.type === 'transfer') {
          transactionData.from_id = formState.from_account_id;
          transactionData.to_id = formState.to_account_id;
        } else {
          transactionData.account_id = formState.account_id;
          transactionData.category_id = formState.category_id;
        }
        
        if (onSave) {
          await onSave(transactionData);
          modalInstance.close();
          document.body.removeChild(modal);
        }
      } catch (error) {
        console.error('[TransactionModal] Ошибка при сохранении:', error);
        alert(`Ошибка при сохранении: ${error.message}`);
      }
    });
    footer.appendChild(saveBtn.element);
    
    content.appendChild(footer);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    const modalInstance = new Modal(modal);
    modalInstance.open();
  }
}

export default TransactionModal;
