export const popScript = `
<script>
window.onload = function () {
  function handleClick(eventType, val) {
    console.log("Event Triggered:", eventType);

    const message = JSON.stringify({
      event: eventType,
      timestamp: Date.now(),
      data: { url: "", value: val }
    });

    const handlers = window.webkit?.messageHandlers;
    const handlerName = eventType === "INAPP_CTA";

    handlers?.[handlerName]?.postMessage(message) ||
      window.parent.postMessage(message, "*");
  }
};
</script>
`;