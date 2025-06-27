export const useDatePickerFilters = () => {
  const customPlugin = fp => ({
    onReady() {
      const container = document.createElement('div')
      container.style.display = 'flex'
      container.style.flexWrap = 'wrap'
      container.style.gap = '6px'
      container.style.justifyContent = 'space-evenly'
      container.style.padding = '6px 10px'

      container.innerHTML = `
        <button class="flatpickr-custom-btn" data-type="today">Today</button>
        <button class="flatpickr-custom-btn" data-type="yesterday">Yesterday</button>
        <button class="flatpickr-custom-btn" data-type="last7">Last 7 Days</button>
        <button class="flatpickr-custom-btn" data-type="thisMonth">This Month</button>
        <button class="flatpickr-custom-btn" data-type="last30">Last 30 Days</button>
      `

      fp.calendarContainer.appendChild(container)

      container.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type
          const now = new Date()
          let start, end

          if (type === 'today') {
            start = end = new Date()
          } else if (type === 'yesterday') {
            start = end = new Date()
            start.setDate(start.getDate() - 1)
          } else if (type === 'last7') {
            start = new Date()
            start.setDate(start.getDate() - 6)
            end = new Date()
          } else if (type === 'thisMonth') {
            start = new Date(now.getFullYear(), now.getMonth(), 1)
            end = new Date()
          } else if (type === 'last30') {
            start = new Date()
            start.setDate(start.getDate() - 29)
            end = new Date()
          }

          if (start && end) {
            fp.setDate([start, end], true)
            fp.close()
          }
        })
      })
    }
  })

  return {
    customPlugin
  }
}
