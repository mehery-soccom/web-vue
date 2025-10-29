export const popScript = `
<script>
window.onload = function () {
  const mediaItems = document.querySelectorAll('.media-item');
  const dots = document.querySelectorAll('.carousel-dots .dot');
  let currentSlide = 0;
  let type = mediaItems[0]?.tagName?.toLowerCase();

  function showSlide(index) {
    mediaItems.forEach((item, i) => {
      item.style.display = i === index ? 'block' : 'none';
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
    currentSlide = index;
  }

  function nextSlide() {
    const nextIndex = (currentSlide + 1) % mediaItems.length;
    showSlide(nextIndex);
  }

  if (type === 'img') {
    setInterval(nextSlide, 3000);
  } else if (type === 'video') {
    mediaItems.forEach((video, index) => {
      video.onended = function () {
        const nextIndex = (index + 1) % mediaItems.length;
        showSlide(nextIndex);
        mediaItems[nextIndex]?.play?.();
      };
    });
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => showSlide(i));
    dot.addEventListener('touchstart', () => showSlide(i));
  });

  function handleClick(eventType, lab, val) {
    console.log("Event Triggered:", eventType);

    const message = JSON.stringify({
      event: eventType,
      timestamp: Date.now(),
      data: { label: lab, value: val }
    });

    const handlers = window.webkit?.messageHandlers;
    const handlerName = eventType === "INAPP_CTA";

    handlers?.[handlerName]?.postMessage(message) ||
      window.parent.postMessage(message, "*");
  }

  showSlide(0);
}
</script>
`;