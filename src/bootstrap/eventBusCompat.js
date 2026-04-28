const COMPATIBILITY_EVENTS = [
  'taskProgressChanged',
  'ritualCompleted',
  'ritualChanged',
  'transactionChanged',
  'transactionAdded',
  'transactionDeleted',
  'timerSessionChanged',
  'timerSessionAdded',
  'timerSessionDeleted',
  'pointsUpdated',
  'pointsRecalculated',
  'dailyPlanChanged',
  'dailyPlanAdded',
  'dailyPlanDeleted'
];

/** Старые слушатели window.addEventListener — дублируем события из EventBus */
export function registerEventBusWindowBridge(eventBus) {
  COMPATIBILITY_EVENTS.forEach((eventName) => {
    eventBus.on(eventName, (detail) => {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    });
  });
}
