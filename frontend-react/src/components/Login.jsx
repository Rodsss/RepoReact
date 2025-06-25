import React, { useState } from 'react';
import * as api from '../api.js'; // Import all functions from api.js

function Login({ onLoginSuccess }) {
  // --- NEW: State to toggle between Login and Register views ---
  const [isRegistering, setIsRegistering] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setError('');
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const response = await fetch(`${baseUrl}/token`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Login failed');

      localStorage.setItem('accessToken', data.access_token);
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    }
  }

  // --- NEW: Handler for the registration form ---
  async function handleRegisterSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      const response = await api.register(email, password);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      alert('Registration successful! Please log in.');
      setIsRegistering(false); // Switch back to the login form
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  // --- NEW: Conditional rendering based on isRegistering state ---
  if (isRegistering) {
    return (
      <div style={{ maxWidth: '400px', margin: '50px auto' }}>
        <h2>Register</h2>
        <form onSubmit={handleRegisterSubmit}>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {/* Email and Password inputs are the same as the login form */}
          <div style={{ marginBottom: '10px' }}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '8px' }}/>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '8px' }}/>
          </div>
          <button type="submit" style={{ width: '100%', padding: '10px' }}>Register</button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '15px' }}>
          Already have an account?{' '}
          <a href="#" onClick={() => setIsRegistering(false)}>Log In</a>
        </p>
      </div>
    );
  }

  // This is the original Login form view
  return (
    <div style={{ maxWidth: '400px', margin: '50px auto' }}>
      <h2>Login</h2>
      <form onSubmit={handleLoginSubmit}>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div style={{ marginBottom: '10px' }}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '8px' }}/>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '8px' }}/>
        </div>
        <button type="submit" style={{ width: '100%', padding: '10px' }}>Login</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '15px' }}>
        Need an account?{' '}
        <a href="#" onClick={() => setIsRegistering(true)}>Register Now</a>
      </p>
    </div>
  );
}

export default Login;