export const popScript = `
<script>
window.onload = function () {
  const mediaItems = document.querySelectorAll('.media-item');
  const dots = document.querySelectorAll('.carousel-dots .dot');
  let currentSlide = 0;
  let type = mediaItems[0]?.tagName?.toLowerCase();

  async function preloadVideos() {
    const videoElements = Array.from(mediaItems).filter(el => el.tagName.toLowerCase() === 'video');

    for (let el of videoElements) {
      const originalSrc = el.getAttribute('src');
      if (originalSrc) {
        try {
          const response = await fetch(originalSrc, { mode: 'no-cors' });
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          el.src = blobUrl;
        } catch (err) {
          console.warn('Prefetch failed for', originalSrc, err);
        }
      }
    }
  }
  // await preloadVideos();

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