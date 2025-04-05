// Main JavaScript for Anas Atta's Portfolio

// Initialize AOS (Animate On Scroll)
document.addEventListener("DOMContentLoaded", () => {
  // Initialize AOS
  if (typeof AOS !== "undefined") {
    AOS.init({
      duration: 800,
      easing: "ease-in-out",
      once: true,
      mirror: false,
    })
  } else {
    console.warn("AOS is not defined. Make sure it is properly imported.")
  }

  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault()

      const targetId = this.getAttribute("href")
      if (targetId === "#") return

      const targetElement = document.querySelector(targetId)
      if (targetElement) {
        window.scrollTo({
          top: targetElement.offsetTop - 75,
          behavior: "smooth",
        })
      }
    })
  })

  // Theme toggle functionality
  const themeToggle = document.getElementById("theme-toggle")
  const themeIcon = themeToggle.querySelector("i")

  themeToggle.addEventListener("click", () => {
    const currentTheme = document.body.getAttribute("data-bs-theme")
    const newTheme = currentTheme === "dark" ? "light" : "dark"

    document.body.setAttribute("data-bs-theme", newTheme)

    // Update icon
    if (newTheme === "dark") {
      themeIcon.classList.remove("bi-moon-fill")
      themeIcon.classList.add("bi-sun-fill")
    } else {
      themeIcon.classList.remove("bi-sun-fill")
      themeIcon.classList.add("bi-moon-fill")
    }

    // Save preference to localStorage
    localStorage.setItem("theme", newTheme)
  })

  // Check for saved theme preference
  const savedTheme = localStorage.getItem("theme")
  if (savedTheme) {
    document.body.setAttribute("data-bs-theme", savedTheme)

    // Update icon based on saved theme
    if (savedTheme === "dark") {
      themeIcon.classList.remove("bi-moon-fill")
      themeIcon.classList.add("bi-sun-fill")
    }
  }

  // Active navigation based on scroll position
  const sections = document.querySelectorAll("section")
  const navLinks = document.querySelectorAll(".navbar-nav .nav-link")

  window.addEventListener("scroll", () => {
    let current = ""

    sections.forEach((section) => {
      const sectionTop = section.offsetTop
      const sectionHeight = section.clientHeight

      if (pageYOffset >= sectionTop - 150) {
        current = section.getAttribute("id")
      }
    })

    navLinks.forEach((link) => {
      link.classList.remove("active")
      if (link.getAttribute("href") === `#${current}`) {
        link.classList.add("active")
      }
    })
  })

  // Contact form handling with EmailJS
  const contactForm = document.getElementById("contactForm")

  if (contactForm) {
    // Initialize EmailJS with your user ID
    // Replace 'your_emailjs_user_id' with your actual EmailJS user ID
    ;(() => {
      if (typeof emailjs !== "undefined") {
        emailjs.init("your_emailjs_user_id")
      } else {
        console.warn("EmailJS is not defined. Make sure it is properly imported.")
        return // Exit the function if EmailJS is not available
      }
    })()

    contactForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const nameInput = document.getElementById("name")
      const emailInput = document.getElementById("email")
      const messageInput = document.getElementById("message")

      // Prepare template parameters
      const templateParams = {
        from_name: nameInput.value,
        from_email: emailInput.value,
        message: messageInput.value,
      }

      // Replace 'your_service_id' and 'your_template_id' with your actual EmailJS service and template IDs
      if (typeof emailjs !== "undefined") {
        emailjs.send("your_service_id", "your_template_id", templateParams).then(
          (response) => {
            console.log("SUCCESS!", response.status, response.text)
            alert("Your message has been sent successfully!")
            contactForm.reset()
          },
          (error) => {
            console.log("FAILED...", error)
            alert("Failed to send the message. Please try again later.")
          },
        )
      } else {
        console.warn("EmailJS is not defined. Cannot send email.")
      }
    })
  }

  // Navbar scroll behavior
  const navbar = document.getElementById("mainNav")

  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar.classList.add("navbar-shrink")
    } else {
      navbar.classList.remove("navbar-shrink")
    }
  })
})

