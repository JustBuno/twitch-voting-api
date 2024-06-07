import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './Navbar';
import TwitchAuth from './TwitchAuth';
import { GIVEAWAYS_ENABLED } from './constants';

function App() {
  return (
    <Router>
      <div className="App">
        <div className="content">
          <Routes>
            <Route path="/auth" element={<TwitchAuth />} />
            {GIVEAWAYS_ENABLED && (
              <Route path="/giveaways" element={<Navbar path='giveaways' />} />
            )}
            <Route path="*" element={<Navbar path='stream' />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;