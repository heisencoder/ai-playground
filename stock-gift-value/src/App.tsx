import type React from 'react'
import { StockGiftCalculator } from './components/StockGiftCalculator'
import './App.css'

function App(): React.JSX.Element {
  return (
    <div className="app">
      <StockGiftCalculator />
    </div>
  )
}

export default App
