import Section from '../layout/Section.js';
import Input from '../form/Input.js';
import Checkbox from '../form/Checkbox.js';
import Button from '../form/Button.js';
import { EmptyState } from '../display/index.js';
import { iconLoader, confirmWithSound } from '../../utils/index.js';
import eventBus from '../../system/core/EventBus.js';

class DailyPlansSection {
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
      console.error('[DailyPlansSection] База данных недоступна');
      this.db = null;
    } else {
      this.db = getDB();
      if (!this.db) {
        console.error('[DailyPlansSection] База данных не инициализирована');
      }
    }
    this.element = null;
    this.plans = [];
    this.section = null;
    this.unsubscribe = null; // Функция для отписки от изменений даты
    this.inputElement = null;
    this.titleContainer = null; // Сохраняем ссылку на контейнер заголовка
    this.eventUnsubscribes = []; // Массив функций отписки от событий
  }

  getCurrentDate() {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  async init() {
    // Создаем поле ввода в заголовке
    const input = new Input({
      type: 'text',
      placeholder: 'Название задачи'
    });
    input.init();
    this.inputElement = input.element;
    
    // Создаем обертку для поля ввода с подсказкой про Enter
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'input-suffix-wrapper';
    inputWrapper.style.display = 'flex';
    inputWrapper.style.alignItems = 'center';
    inputWrapper.style.flex = '1';
    inputWrapper.style.minWidth = '0';
    inputWrapper.style.position = 'relative';
    
    // Настраиваем поле ввода
    this.inputElement.style.flex = '1';
    this.inputElement.style.minWidth = '0';
    this.inputElement.style.width = '100%';
    this.inputElement.style.paddingRight = 'calc(var(--space-md) + 20px + var(--space-sm))';
    
    // Загружаем иконку для подсказки про Enter
    let enterIcon = '';
    try {
      // Пробуем загрузить иконку для Enter (corner-down-left похожа на стрелку Enter)
      enterIcon = await iconLoader.loadIcon('corner-down-left').catch(() => 
        iconLoader.loadIcon('arrow-right').catch(() => '')
      );
    } catch (e) {
      // Если иконка не загрузилась, используем текст
    }
    
    // Создаем подсказку про Enter (иконка или текст)
    const enterHint = document.createElement('span');
    enterHint.className = 'input-enter-hint';
    enterHint.style.position = 'absolute';
    enterHint.style.right = 'var(--space-md)';
    enterHint.style.display = 'flex';
    enterHint.style.alignItems = 'center';
    enterHint.style.justifyContent = 'center';
    enterHint.style.pointerEvents = 'none';
    enterHint.style.color = 'var(--color-on-surface-secondary)';
    enterHint.style.opacity = '0.5';
    enterHint.style.fontSize = 'var(--font-size-xs)';
    
    if (enterIcon) {
      enterHint.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">${enterIcon}</svg>`;
    } else {
      enterHint.textContent = 'Enter';
      enterHint.style.fontSize = 'var(--font-size-xs)';
      enterHint.style.fontWeight = 'var(--font-normal)';
    }
    
    inputWrapper.appendChild(this.inputElement);
    inputWrapper.appendChild(enterHint);
    
    // Обработчик Enter для добавления плана
    this.inputElement.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        await this.handleAddPlan();
      }
    });
    
    // Создаем секцию с заголовком и полем ввода в titleActions
    this.section = new Section({ 
      title: 'Планы',
      titleActions: inputWrapper
    });
    this.element = this.section.render();
    
    // Инициализируем метку выполненных задач
    this.updatePlansBadge();
    
    // Сохраняем ссылку на контейнер заголовка для использования в render()
    this.titleContainer = Array.from(this.element.children).find(child => {
      return child.querySelector('h2, h3, .page-title') !== null;
    });
    
    if (this.titleContainer) {
      // Добавляем gap
      this.titleContainer.style.gap = 'var(--space-md)';
      
      // Заголовок должен быть flex-shrink: 0
      const heading = this.titleContainer.querySelector('h2, h3, .page-title');
      if (heading) {
        heading.style.flexShrink = '0';
      }
      
      // Обертка поля ввода должна быть справа с отступом
      const inputWrapper = this.titleContainer.querySelector('.input-suffix-wrapper');
      if (inputWrapper) {
        inputWrapper.style.flex = '1';
        inputWrapper.style.minWidth = '200px';
        inputWrapper.style.maxWidth = '400px';
        inputWrapper.style.marginLeft = 'var(--space-lg)'; // Отступ от заголовка
      }
    }
    
    // Подписываемся на изменения выбранной даты
    const selectedDateState = window.selectedDateState;
    if (selectedDateState) {
      this.unsubscribe = selectedDateState.subscribe(async (date, dateString) => {
        this.date = dateString;
        await this.loadPlans();
        await this.render();
      });
    }
    
    // Загружаем планы
    await this.loadPlans();
    
    // Создаем контент
    await this.render();

    // Подписываемся на события обновления планов
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Подписка на добавление планов
    const unsubscribePlanAdded = eventBus.on('dailyPlanAdded', async (detail) => {
      const eventDate = detail.date || (detail.data && detail.data.date);
      if (eventDate && eventDate !== this.date) {
        return; // Игнорируем изменения для других дат
      }
      await this.loadPlans();
      await this.render();
    });
    this.eventUnsubscribes.push(unsubscribePlanAdded);

    // Подписка на изменение планов
    const unsubscribePlanChanged = eventBus.on('dailyPlanChanged', async (detail) => {
      const eventDate = detail.date || (detail.data && detail.data.date);
      if (eventDate && eventDate !== this.date) {
        return;
      }
      
      // Если есть ID плана - обновляем только его
      const planId = detail.data?.id || detail.planId;
      if (planId) {
        await this.updatePlanCard(planId);
      } else {
        await this.loadPlans();
        await this.render();
      }
    });
    this.eventUnsubscribes.push(unsubscribePlanChanged);

    // Подписка на удаление планов
    const unsubscribePlanDeleted = eventBus.on('dailyPlanDeleted', async (detail) => {
      const eventDate = detail.date || (detail.data && detail.data.date);
      if (eventDate && eventDate !== this.date) {
        return;
      }
      await this.loadPlans();
      await this.render();
    });
    this.eventUnsubscribes.push(unsubscribePlanDeleted);
  }

  /**
   * Обновить карточку плана по ID
   */
  async updatePlanCard(planId) {
    if (!this.db || !this.element) return;

    // Находим план
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) {
      await this.loadPlans();
      await this.render();
      return;
    }

    // Находим карточку в DOM
    const card = this.element.querySelector(`[data-plan-id="${planId}"]`);
    if (!card) {
      await this.loadPlans();
      await this.render();
      return;
    }

    // Обновляем состояние чекбокса
    const checkboxInput = card.querySelector('input[type="checkbox"]');
    if (checkboxInput) {
      checkboxInput.checked = plan.completed === 1;
    }

    // Обновляем стили текста
    const title = card.querySelector('.act-card-title');
    if (title) {
      if (plan.completed === 1) {
        title.style.textDecoration = 'line-through';
        title.style.opacity = '0.6';
        title.style.color = 'var(--color-on-surface-secondary)';
        card.classList.add('completed');
      } else {
        title.style.textDecoration = 'none';
        title.style.opacity = '1';
        title.style.color = 'var(--color-on-surface)';
        card.classList.remove('completed');
      }
    }
  }

  /**
   * Подсчитывает количество выполненных задач
   * @returns {Object} { completed: number, total: number }
   */
  getCompletedCount() {
    if (!this.plans || this.plans.length === 0) {
      return { completed: 0, total: 0 };
    }
    
    const completed = this.plans.filter(p => p.completed === 1).length;
    return { completed, total: this.plans.length };
  }

  /**
   * Обновляет метку выполненных задач в заголовке секции
   */
  updatePlansBadge() {
    if (!this.section) return;
    
    const { completed, total } = this.getCompletedCount();
    
    if (total > 0) {
      this.section.updateBadges([
        { text: `${completed} из ${total}` }
      ]);
    } else {
      this.section.updateBadges(null);
    }
  }

  async loadPlans() {
    try {
      if (!this.db) {
        console.warn('[DailyPlansSection] База данных недоступна для загрузки планов');
        this.plans = [];
        this.updatePlansBadge();
        return;
      }
      
      // Получаем актуальную выбранную дату
      const selectedDateState = window.selectedDateState;
      const dateToLoad = selectedDateState ? selectedDateState.getSelectedDateString() : this.date;
      
      this.plans = this.db.getDailyPlans(dateToLoad);
      this.date = dateToLoad; // Обновляем текущую дату
      
      console.log(`[DailyPlansSection] Загружено планов за ${dateToLoad}:`, this.plans.length);
      
      // Обновляем метку после загрузки
      this.updatePlansBadge();
    } catch (error) {
      console.error('[DailyPlansSection] Ошибка загрузки планов:', error);
      this.plans = [];
      this.updatePlansBadge();
    }
  }

  async handleAddPlan() {
    const title = this.inputElement.value.trim();
    if (!title) {
      return;
    }
    
    try {
      // Получаем актуальную выбранную дату
      const selectedDateState = window.selectedDateState;
      const currentDate = selectedDateState ? selectedDateState.getSelectedDateString() : this.date;
      
      // Генерируем ID
      const id = `plan_${currentDate.replace(/-/g, '')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Добавляем план
      const plan = {
        id: id,
        date: currentDate,
        title: title,
        completed: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('[DailyPlansSection] Добавление плана:', plan);
      this.db.addDailyPlan(plan);
      
      // Небольшая задержка для гарантии, что данные сохранены в БД
      setTimeout(() => {
        // Отправляем событие через EventBus с деталями ПОСЛЕ сохранения
        eventBus.emit('dailyPlanAdded', {
          action: 'create',
          data: plan,
          affectedIds: [plan.id],
          date: plan.date
        });
      }, 0);
      
      // Очищаем поле ввода
      this.inputElement.value = '';
      
      // Перезагружаем и перерисовываем
      await this.loadPlans();
      await this.render();
    } catch (error) {
      console.error('[DailyPlansSection] Ошибка добавления плана:', error);
      alert('Ошибка при добавлении плана');
    }
  }

  async handleToggleComplete(planId, currentCompleted) {
    try {
      // Получаем предыдущие данные
      const previousPlan = this.plans.find(p => p.id === planId);
      
      const newCompleted = currentCompleted === 1 ? 0 : 1;
      this.db.updateDailyPlan(planId, { completed: newCompleted });
      
      // Получаем обновленные данные
      await this.loadPlans();
      const updatedPlan = this.plans.find(p => p.id === planId);
      
      // Небольшая задержка для гарантии, что данные сохранены в БД
      setTimeout(() => {
        // Отправляем событие через EventBus с деталями ПОСЛЕ сохранения
        eventBus.emit('dailyPlanChanged', {
          action: 'update',
          data: updatedPlan || { id: planId, completed: newCompleted },
          previousData: previousPlan,
          affectedIds: [planId],
          date: updatedPlan?.date || previousPlan?.date || this.date
        });
      }, 0);
      
      // Перезагружаем и перерисовываем
      await this.render();
    } catch (error) {
      console.error('[DailyPlansSection] Ошибка обновления плана:', error);
      alert('Ошибка при обновлении плана');
    }
  }

  async handleDelete(planId) {
    try {
      const confirmed = await confirmWithSound('Удалить план?');
      if (!confirmed) {
        return;
      }
      
      // Получаем данные плана перед удалением
      const deletedPlan = this.plans.find(p => p.id === planId);
      const planDate = deletedPlan?.date || this.date;
      
      this.db.deleteDailyPlan(planId);
      
      // Небольшая задержка для гарантии, что данные удалены из БД
      setTimeout(() => {
        // Отправляем событие через EventBus с деталями ПОСЛЕ удаления
        eventBus.emit('dailyPlanDeleted', {
          action: 'delete',
          data: deletedPlan || { id: planId },
          affectedIds: [planId],
          date: planDate
        });
      }, 0);
      
      // Перезагружаем и перерисовываем
      await this.loadPlans();
      await this.render();
    } catch (error) {
      console.error('[DailyPlansSection] Ошибка удаления плана:', error);
      alert('Ошибка при удалении плана');
    }
  }

  async handleMovePlan(planId, direction) {
    try {
      // Получаем текущие планы
      const plans = [...this.plans];
      const currentIndex = plans.findIndex(p => p.id === planId);
      
      if (currentIndex === -1) return;
      
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      // Проверяем границы
      if (newIndex < 0 || newIndex >= plans.length) return;
      
      // Меняем местами планы, обновляя created_at для сохранения порядка
      const currentPlan = plans[currentIndex];
      const targetPlan = plans[newIndex];
      
      // Меняем местами временные метки
      const tempCreatedAt = currentPlan.created_at;
      currentPlan.created_at = targetPlan.created_at;
      targetPlan.created_at = tempCreatedAt;
      
      // Обновляем в базе данных
      this.db.updateDailyPlan(currentPlan.id, { 
        created_at: currentPlan.created_at,
        updated_at: new Date().toISOString()
      });
      this.db.updateDailyPlan(targetPlan.id, { 
        created_at: targetPlan.created_at,
        updated_at: new Date().toISOString()
      });
      
      // Перезагружаем и перерисовываем
      await this.loadPlans();
      await this.render();
    } catch (error) {
      console.error('[DailyPlansSection] Ошибка перемещения плана:', error);
      alert('Ошибка при перемещении плана');
    }
  }


  async render() {
    // Находим или создаем контейнер списка
    let list = this.element.querySelector('.act-list-items');
    
    if (!list) {
      // Создаем список планов только если его нет
      list = document.createElement('div');
      list.className = 'act-list-items';
      // Стили перенесены в CSS (lists.css)
      list.style.overflowY = 'auto';
      list.style.flex = '1';
      list.style.minHeight = '0';
      this.element.appendChild(list);
    } else {
      // Очищаем только содержимое контейнера, не удаляя сам контейнер
      list.innerHTML = '';
    }

    if (this.plans.length === 0) {
      const emptyState = new EmptyState({ type: 'plans' });
      await emptyState.init();
      list.appendChild(emptyState.render());
    } else {
      for (let i = 0; i < this.plans.length; i++) {
        const plan = this.plans[i];
        const card = await this.createPlanCard(plan, i);
        if (card) {
          list.appendChild(card);
        }
      }
    }
    
    // Обновляем метку после рендера
    this.updatePlansBadge();
  }

  async createPlanCard(plan, index) {
    const card = document.createElement('div');
    card.className = 'act-card';
    card.dataset.planId = plan.id; // Добавляем data-атрибут для быстрого поиска
    if (plan.completed === 1) {
      card.classList.add('completed');
    }

    // Чекбокс слева (фиксированная ширина)
    const checkbox = new Checkbox({ checked: plan.completed === 1 });
    const checkboxElement = checkbox.render();
    const checkboxInput = checkboxElement.querySelector('input[type="checkbox"]');
    checkboxElement.style.flexShrink = '0';
    checkboxElement.style.width = 'var(--height-control)';
    
    checkboxInput.addEventListener('change', async (e) => {
      e.stopPropagation();
      await this.handleToggleComplete(plan.id, plan.completed);
    });
    
    card.appendChild(checkboxElement);
    
    // Обработчик клика на карточку для переключения чекбокса
    card.addEventListener('click', async (e) => {
      // Проверяем, не кликнули ли на элементы управления или сам чекбокс
      if (e.target.closest('.plans-card-controls') || e.target.closest('.checkbox-label')) {
        return;
      }
      
      // Переключаем состояние чекбокса
      await this.handleToggleComplete(plan.id, plan.completed);
    });

    // Текст задачи по центру (flex: 1)
    const content = document.createElement('div');
    content.className = 'act-card-content';
    content.style.flex = '1';
    content.style.minWidth = '0';
    
    const title = document.createElement('span');
    title.className = 'act-card-title';
    title.textContent = plan.title || 'Без названия';
    title.style.flex = '1';
    title.style.minWidth = '0';
    
    // Применяем стили для выполненных задач
    if (plan.completed === 1) {
      title.style.textDecoration = 'line-through';
      title.style.opacity = '0.6';
      title.style.color = 'var(--color-on-surface-secondary)';
    }
    
    content.appendChild(title);
    card.appendChild(content);

    // Контейнер для кнопок управления (справа, показывается при hover)
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'plans-card-controls';

    // Компактная группа кнопок с разделителями
    const actions = document.createElement('div');
    actions.className = 'plans-card-actions-group';
    
    // Кнопка перемещения вверх
    const moveUpBtn = new Button({
      iconName: 'chevron-up'
    });
    await moveUpBtn.init();
    moveUpBtn.element.classList.add('plans-control-btn');
    moveUpBtn.element.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.handleMovePlan(plan.id, 'up');
    });
    
    // Разделитель
    const divider1 = document.createElement('div');
    divider1.className = 'plans-control-divider';
    
    // Кнопка перемещения вниз
    const moveDownBtn = new Button({
      iconName: 'chevron-down'
    });
    await moveDownBtn.init();
    moveDownBtn.element.classList.add('plans-control-btn');
    moveDownBtn.element.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.handleMovePlan(plan.id, 'down');
    });
    
    // Разделитель
    const divider2 = document.createElement('div');
    divider2.className = 'plans-control-divider';
    
    // Кнопка удаления
    const deleteBtn = new Button({
      iconName: 'trash-2'
    });
    await deleteBtn.init();
    deleteBtn.element.classList.add('plans-control-btn');
    deleteBtn.element.addEventListener('click', async (e) => {
      e.stopPropagation();
      await this.handleDelete(plan.id);
    });
    
    // Собираем кнопки в группу
    actions.appendChild(moveUpBtn.element);
    actions.appendChild(divider1);
    actions.appendChild(moveDownBtn.element);
    actions.appendChild(divider2);
    actions.appendChild(deleteBtn.element);
    
    controlsContainer.appendChild(actions);
    card.appendChild(controlsContainer);

    return card;
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    // Отписываемся от всех событий
    this.eventUnsubscribes.forEach(unsubscribe => unsubscribe());
    this.eventUnsubscribes = [];
  }
}

export default DailyPlansSection;

