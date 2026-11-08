import { mount } from 'svelte';
import App from './App.svelte';
import '@/assets/theme.css';

mount(App, { target: document.getElementById('app') ?? document.body });
