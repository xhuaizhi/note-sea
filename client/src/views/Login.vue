<template>
  <div class="login-page" :class="{ 'has-bg': !!bgImage }" :style="bgStyle">
    <form class="form" @submit.prevent="handleSubmit">
      <div class="content">
        <div class="logo-slot">
          <img src="/logo.png" alt="Logo" class="logo-img" />
        </div>
        <p class="title">{{ isSetup ? '设置访问密码' : 'Note Sea' }}</p>
        <div class="inp">
          <input
            v-model="password"
            type="password"
            class="input"
            :placeholder="isSetup ? '密码（≥8位）' : '请输入密码'"
            autofocus
          />
          <input
            v-if="isSetup"
            v-model="confirmPassword"
            type="password"
            class="input"
            placeholder="确认密码"
          />
        </div>
        <p class="error" :class="{ 'is-visible': !!error }">{{ error || ' ' }}</p>
        <button type="submit" class="submit-btn" :disabled="submitting">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          {{ submitting ? '验证中...' : (isSetup ? '设置密码' : '登录') }}
        </button>
        <svg class="svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="#4073ff" d="M56.8,-23.9C61.7,-3.2,45.7,18.8,26.5,31.7C7.2,44.6,-15.2,48.2,-35.5,36.5C-55.8,24.7,-73.9,-2.6,-67.6,-25.2C-61.3,-47.7,-30.6,-65.6,-2.4,-64.8C25.9,-64.1,51.8,-44.7,56.8,-23.9Z" transform="translate(100 100)" class="path"></path>
        </svg>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { useSettingsStore } from '../stores/settings.js';

const router = useRouter();
const auth = useAuthStore();
const settingsStore = useSettingsStore();

const password = ref('');
const confirmPassword = ref('');
const error = ref('');
const submitting = ref(false);
const isSetup = ref(false);

const bgImage = computed(() => settingsStore.loginBg);
const bgStyle = computed(() => {
  if (!bgImage.value) return {};
  return {
    backgroundImage: `url("${bgImage.value}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  };
});

onMounted(async () => {
  settingsStore.fetchSettings();
  if (auth.isLoggedIn) {
    router.replace('/');
    return;
  }
  try {
    const res = await fetch('/api/auth/status');
    const data = await res.json();
    isSetup.value = !data.initialized;
  } catch {
    error.value = '无法连接服务器，请检查网络后刷新页面';
  }
});

async function handleSubmit() {
  error.value = '';
  if (!password.value) {
    error.value = '请输入密码';
    return;
  }
  if (isSetup.value) {
    if (password.value.length < 8) { error.value = '密码至少 8 位'; return; }
    if (password.value !== confirmPassword.value) {
      error.value = '两次密码不一致';
      return;
    }
  }
  submitting.value = true;
  try {
    const url = isSetup.value ? '/api/auth/setup' : '/api/auth/login';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password.value })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      error.value = data.error || '请求失败';
      return;
    }
    auth.setToken(data.token);
    router.replace('/');
  } catch {
    error.value = '网络异常，请稍后重试';
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ivory);
  position: relative;
  overflow: hidden;
}

.form {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1.5px solid rgba(200, 200, 200, 0.4);
  width: 23.4em;
  min-height: 23.4em;
  padding: 2.16em;
  position: relative;
  z-index: 1;
  box-sizing: border-box;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  justify-content: center;
  position: relative;
  min-height: 100%;
}

.logo-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin: 0 auto 12px;
}

.logo-img {
  width: 72px;
  height: 72px;
  object-fit: contain;
}

.title {
  color: #1a1a1a;
  font-weight: 700;
  text-align: center;
  font-size: 24px;
  letter-spacing: 0.5px;
  margin: 0 0 8px 0;
  font-family: 'Poppins', sans-serif;
}

.path {
  fill: #369eff;
}

.svg {
  filter: blur(20px);
  z-index: -1;
  position: absolute;
  opacity: 50%;
  animation: anim 3s infinite;
  top: 30%;
  left: 50%;
  transform: translateX(-50%);
  width: 240px;
  height: 240px;
}

.inp {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input {
  color: #1a1a1a;
  height: 2.8em;
  width: 100%;
  text-align: center;
  background: rgba(255, 255, 255, 0.15);
  outline: none;
  border: 1.5px solid rgba(200, 200, 200, 0.5);
  border-radius: 10px;
  transition: all 0.6s ease;
  font-size: 14px;
  padding: 0 14px;
  box-sizing: border-box;
  letter-spacing: 1px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.08);
}

.input::placeholder {
  color: rgba(26, 26, 26, 0.45);
  letter-spacing: 0;
}

.input:focus {
  outline: none;
  border: 1.5px solid rgba(150, 150, 150, 0.7);
  background: rgba(255, 255, 255, 0.25);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.08), 0 0 0 3px rgba(200, 200, 200, 0.15);
}

.input:not(:placeholder-shown) {
  opacity: 95%;
}

.submit-btn {
  position: relative;
  display: block;
  flex-shrink: 0;
  margin: 16px auto 0;
  padding: 12px 28px;
  background: transparent;
  color: #1a1a1a;
  font-size: 15px;
  font-weight: bold;
  letter-spacing: 3px;
  text-transform: uppercase;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  overflow: hidden;
  transition: 0.5s;
  min-width: 9em;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.submit-btn:hover:not(:disabled) {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.submit-btn:active:not(:disabled) {
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.submit-btn span {
  position: absolute;
  display: block;
}

.submit-btn span:nth-child(1) {
  top: 0;
  left: -100%;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #369eff);
  animation: btn-anim1 1.5s linear infinite;
}

@keyframes btn-anim1 {
  0% { left: -100%; }
  50%, 100% { left: 100%; }
}

.submit-btn span:nth-child(2) {
  top: -100%;
  right: 0;
  width: 2px;
  height: 100%;
  background: linear-gradient(180deg, transparent, #369eff);
  animation: btn-anim2 1.5s linear infinite;
  animation-delay: 0.375s;
}

@keyframes btn-anim2 {
  0% { top: -100%; }
  50%, 100% { top: 100%; }
}

.submit-btn span:nth-child(3) {
  bottom: 0;
  right: -100%;
  width: 100%;
  height: 2px;
  background: linear-gradient(270deg, transparent, #369eff);
  animation: btn-anim3 1.5s linear infinite;
  animation-delay: 0.75s;
}

@keyframes btn-anim3 {
  0% { right: -100%; }
  50%, 100% { right: 100%; }
}

.submit-btn span:nth-child(4) {
  bottom: -100%;
  left: 0;
  width: 2px;
  height: 100%;
  background: linear-gradient(360deg, transparent, #369eff);
  animation: btn-anim4 1.5s linear infinite;
  animation-delay: 1.125s;
}

@keyframes btn-anim4 {
  0% { bottom: -100%; }
  50%, 100% { bottom: 100%; }
}

.error {
  color: #ff6b6b;
  font-size: 13px;
  text-align: center;
  font-weight: normal;
  margin: 0;
  min-height: 18px;
  line-height: 18px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.error.is-visible {
  opacity: 1;
}

@keyframes anim {
  0% { transform: translate(-50%, -70px); }
  50% { transform: translate(-50%, -19px); }
  100% { transform: translate(-50%, -70px); }
}
</style>
