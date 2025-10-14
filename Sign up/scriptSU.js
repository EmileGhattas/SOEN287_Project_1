// Select elements
const daySelect = document.getElementById('day');
const monthSelect = document.getElementById('month');
const yearSelect = document.getElementById('year');

// Add placeholder options
daySelect.innerHTML = '<option value="">Day</option>';
monthSelect.innerHTML = '<option value="">Month</option>';
yearSelect.innerHTML = '<option value="">Year</option>';

// Fill days 1–31
for (let d = 1; d <= 31; d++) {
  const option = document.createElement('option');
  option.value = d;
  option.textContent = d;
  daySelect.appendChild(option);
}

// Fill months 1–12
for (let m = 1; m <= 12; m++) {
  const option = document.createElement('option');
  option.value = m;
  option.textContent = m;
  monthSelect.appendChild(option);
}

// Fill years 1900–current
const currentYear = new Date().getFullYear();
for (let y = currentYear; y >= 1900; y--) {
  const option = document.createElement('option');
  option.value = y;
  option.textContent = y;
  yearSelect.appendChild(option);
}

// Validation
document.addEventListener('DOMContentLoaded', function () {
  const daySelect = document.getElementById('day');
  const monthSelect = document.getElementById('month');
  const yearSelect = document.getElementById('year');
  const dobError = document.getElementById('dob-error');

  // (Your existing code for filling days/months/years...)

  document.querySelector('form').addEventListener('submit', function (event) {
    const day = parseInt(daySelect.value);
    const month = parseInt(monthSelect.value);
    const year = parseInt(yearSelect.value);

    const date = new Date(year, month - 1, day);
    const isValid =
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day;

    if (!isValid) {
      event.preventDefault(); // Stop submission
      dobError.style.display = 'block'; // Show error
    } else {
      dobError.style.display = 'none'; // Hide error
    }
  });
});

document.getElementById('signupForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Save to LocalStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];
    users.push({ email, username, password });
    localStorage.setItem('users', JSON.stringify(users));

    alert('Account created successfully!');

    // Redirect to main page
    window.location.href = '../mainpage.html'; // <-- adjust path to your main page
});

