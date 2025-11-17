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

//  Form Submission
document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim().toLowerCase();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const day = parseInt(daySelect.value);
    const month = parseInt(monthSelect.value);
    const year = parseInt(yearSelect.value);

    // DOB validation
    const date = new Date(year, month - 1, day);
    const isValidDOB =
        date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day;

    if (!isValidDOB) {
        document.getElementById('dob-error').style.display = 'block';
        return;
    } else {
        document.getElementById('dob-error').style.display = 'none';
    }

    if (!email || !username || !password) {
        alert('Please fill out all required fields.');
        return;
    }

    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Signup successful, store JWT token
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            alert('Account created successfully!');
            window.location.href = '/booking'; // or landing page
        } else {
            alert(data.message || 'Signup failed. Please try again.');
        }
    } catch (err) {
        console.error('Signup error:', err);
        alert('An error occurred. Please try again later.');
    }
});