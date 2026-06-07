document.addEventListener('DOMContentLoaded', () => {

  /* ── Mobile Nav Toggle ── */
  const toggle = document.getElementById('navToggle')
  const links  = document.getElementById('navLinks')

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open')
    })

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        links.classList.remove('open')
      })
    })
  }

  /* ── FAQ Accordion ── */
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item')
      const isOpen = item.classList.contains('open')

      // close all
      document.querySelectorAll('.faq-item.open').forEach(i => {
        i.classList.remove('open')
        i.querySelector('.faq-question').setAttribute('aria-expanded', 'false')
      })

      // toggle current
      if (!isOpen) {
        item.classList.add('open')
        btn.setAttribute('aria-expanded', 'true')
      }
    })
  })

  /* ── Scroll Reveal ── */
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.15 })

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'))
  }
})
