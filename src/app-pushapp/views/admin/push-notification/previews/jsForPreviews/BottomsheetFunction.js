export const popScript = `
<script>
window.onload = function () {
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
};
</script>
`;