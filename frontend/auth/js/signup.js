// Sign up form handling with client-side validation and API integration
const daySelect = document.getElementById('day');
const monthSelect = document.getElementById('month');
const yearSelect = document.getElementById('year');
const messageBox = document.getElementById('formMessage');
const form = document.getElementById('signupForm');
const submitBtn = document.getElementById('submitbtn');

function showMessage(text, type = 'error') {
  if (!messageBox) return alert(text);
  messageBox.textContent = text;
  messageBox.classList.remove('error', 'success');
  messageBox.classList.add(type);
  messageBox.style.display = text ? 'block' : 'none';
}

// Add placeholder options
if (daySelect && monthSelect && yearSelect) {
  daySelect.innerHTML = '<option value="">Day</option>';
  monthSelect.innerHTML = '<option value="">Month</option>';
  yearSelect.innerHTML = '<option value="">Year</option>';

  for (let d = 1; d <= 31; d++) {
    const option = document.createElement('option');
    option.value = d;
    option.textContent = d;
    daySelect.appendChild(option);
  }

  for (let m = 1; m <= 12; m++) {
    const option = document.createElement('option');
    option.value = m;
    option.textContent = m;
    monthSelect.appendChild(option);
  }

  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= 1900; y--) {
    const option = document.createElement('option');
    option.value = y;
    option.textContent = y;
    yearSelect.appendChild(option);
  }
}

function validDob(day, month, year) {
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showMessage('', 'success');

    const email = document.getElementById('email').value.trim().toLowerCase();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const day = parseInt(daySelect.value, 10);
    const month = parseInt(monthSelect.value, 10);
    const year = parseInt(yearSelect.value, 10);

    const dobError = document.getElementById('dob-error');
    const validDate = validDob(day, month, year);
    dobError.style.display = validDate ? 'none' : 'block';
    if (!validDate) return;

    if (!email || !username || !password) {
      showMessage('Please fill out all required fields.');
      return;
    }

    if (!document.getElementById('terms').checked) {
      showMessage('Please accept the terms before continuing.');
      return;
    }

    submitBtn.disabled = true;

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password })
      });

      const data = await response.json();

      if (response.ok) {
        const isAdmin = Boolean(data?.user?.is_admin ?? data?.user?.admin ?? data?.user?.isadmin);
        const normalizedUser = { ...data.user, is_admin: isAdmin };
        delete normalizedUser.admin;
        delete normalizedUser.isadmin;

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(normalizedUser));

        showMessage('Account created! Redirecting to bookings...', 'success');
        setTimeout(() => {
          window.location.href = '/booking';
        }, 400);
      } else {
        showMessage(data.message || 'Signup failed. Please try again.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      showMessage('An error occurred. Please try again later.');
    } finally {
      submitBtn.disabled = false;
    }
  });
}
