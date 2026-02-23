import { StrictMode } from 'react' //dev tool that catches "bad" code. it makes it ready for concurrent rendering. it does this by running everything twice
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' //router provided by react-router-dom it allows us the keep the code in sync with the UI
import App from './App.jsx'
import './styles.css'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
