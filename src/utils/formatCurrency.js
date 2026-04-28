/**
 * Утилиты для форматирования денежных сумм
 */

// Кэш для валюты
let currencyCache = null;

/**
 * Получает валюту из настроек приложения
 * @returns {Object} Объект с кодом валюты и символом
 */
export function getCurrency() {
  // Если есть кэш, возвращаем его
  if (currencyCache) {
    return currencyCache;
  }

  // Пытаемся получить из базы данных
  try {
    const getDB = window.getDB;
    if (getDB) {
      const db = getDB();
      if (db) {
        const settings = db.getAll('app_settings');
        if (settings.length > 0) {
          const currencyCode = settings[0].currency || 'RUB';
          const symbol = getCurrencySymbol(currencyCode);
          currencyCache = { code: currencyCode, symbol };
          return currencyCache;
        }
      }
    }
  } catch (e) {
    console.warn('[formatCurrency] Ошибка получения валюты из настроек:', e);
  }

  // Значение по умолчанию
  currencyCache = { code: 'RUB', symbol: '₽' };
  return currencyCache;
}

/**
 * Получает символ валюты по коду
 * @param {string} currencyCode - Код валюты
 * @returns {string} Символ валюты
 */
function getCurrencySymbol(currencyCode) {
  const symbols = {
    'RUB': '₽',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CNY': '¥',
    'KZT': '₸',
    'BYN': 'Br',
    'PLN': 'zł'
  };
  return symbols[currencyCode] || '₽';
}

/**
 * Сбрасывает кэш валюты (вызывается при изменении валюты)
 */
export function resetCurrencyCache() {
  currencyCache = null;
}

/**
 * Форматирует денежную сумму в выбранную валюту
 * @param {number} amount - Сумма для форматирования
 * @param {Object} options - Опции форматирования
 * @param {boolean} options.showDecimals - Показывать ли десятичные знаки (по умолчанию false для больших сумм, true для транзакций)
 * @param {number} options.decimals - Количество десятичных знаков (по умолчанию 2)
 * @returns {string} Отформатированная строка с символом валюты
 */
export function formatCurrency(amount, options = {}) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    const currency = getCurrency();
    return `0 ${currency.symbol}`;
  }

  const { showDecimals = false, decimals = 2 } = options;
  const currency = getCurrency();

  let formatted;
  if (showDecimals) {
    // Для транзакций - с двумя десятичными знаками
    formatted = amount.toLocaleString('ru-RU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  } else {
    // Для балансов и больших сумм - без десятичных знаков
    formatted = amount.toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  return `${formatted} ${currency.symbol}`;
}

/**
 * Форматирует денежную сумму для транзакций (с двумя десятичными знаками)
 * @param {number} amount - Сумма для форматирования
 * @returns {string} Отформатированная строка с символом валюты
 */
export function formatTransactionAmount(amount) {
  return formatCurrency(amount, { showDecimals: true, decimals: 2 });
}

/**
 * Форматирует денежную сумму для балансов (без десятичных знаков)
 * @param {number} amount - Сумма для форматирования
 * @returns {string} Отформатированная строка с символом валюты
 */
export function formatBalance(amount) {
  return formatCurrency(amount, { showDecimals: false });
}

export default {
  formatCurrency,
  formatTransactionAmount,
  formatBalance,
  getCurrency,
  resetCurrencyCache
};

