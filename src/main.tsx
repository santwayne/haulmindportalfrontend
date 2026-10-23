import { StrictMode } from 'react'
import { ConfigProvider } from "antd";
import './index.css'
import "antd/dist/reset.css";
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { Provider } from "react-redux";
import { store } from "./redux/store.tsx";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
    <ConfigProvider>
      <App />
    </ConfigProvider>
    </Provider>
  </StrictMode>,
)
