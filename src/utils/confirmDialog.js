/**
 * Утилита для показа диалога подтверждения с звуком
 * Использует кастомные диалоги вместо нативных для избежания блокировки UI
 */

/**
 * Показывает диалог подтверждения с воспроизведением звука
 * @param {string} message - Сообщение для подтверждения
 * @returns {Promise<boolean>} - true если пользователь подтвердил, false если отменил
 */
export async function confirmWithSound(message) {
  // Используем кастомный confirm (звук уже встроен)
  const { customConfirm } = await import('./customDialogs.js');
  return await customConfirm(message);
}

export default confirmWithSound;
