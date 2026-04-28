/**
 * Утилита для добавления drag scroll функциональности к элементам
 */

/**
 * Добавляет drag scroll к элементу
 * @param {HTMLElement} element - Элемент, к которому добавляется drag scroll
 * @param {Object} options - Опции
 * @param {number} options.speed - Скорость прокрутки (по умолчанию 2)
 */
export function setupDragScroll(element, options = {}) {
  if (!element) return;

  const speed = options.speed || 2;
  let isDown = false;
  let startX;
  let startY;
  let scrollLeft;
  let scrollTop;

  const handleMouseDown = (e) => {
    isDown = true;
    element.classList.add('dragging');
    startX = e.pageX - element.offsetLeft;
    startY = e.pageY - element.offsetTop;
    scrollLeft = element.scrollLeft;
    scrollTop = element.scrollTop;
  };

  const handleMouseLeave = () => {
    isDown = false;
    element.classList.remove('dragging');
  };

  const handleMouseUp = () => {
    isDown = false;
    element.classList.remove('dragging');
  };

  const handleMouseMove = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - element.offsetLeft;
    const y = e.pageY - element.offsetTop;
    const walkX = (x - startX) * speed;
    const walkY = (y - startY) * speed;
    element.scrollLeft = scrollLeft - walkX;
    element.scrollTop = scrollTop - walkY;
  };

  element.addEventListener('mousedown', handleMouseDown);
  element.addEventListener('mouseleave', handleMouseLeave);
  element.addEventListener('mouseup', handleMouseUp);
  element.addEventListener('mousemove', handleMouseMove);

  // Возвращаем функцию для очистки
  return () => {
    element.removeEventListener('mousedown', handleMouseDown);
    element.removeEventListener('mouseleave', handleMouseLeave);
    element.removeEventListener('mouseup', handleMouseUp);
    element.removeEventListener('mousemove', handleMouseMove);
  };
}

export default setupDragScroll;
