import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Splash from './pages/Splash';
import Welcome from './pages/Welcome';
import Dashboard from './pages/Dashboard';
import AddMachine from './pages/AddMachine';
import MachineDetail from './pages/MachineDetail';
import ChecklistEntry from './pages/ChecklistEntry';
import History from './pages/History';
import Export from './pages/Export';
import TemplateBuilder from './pages/TemplateBuilder';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/add-machine" element={<AddMachine />} />
      <Route path="/machine/:id" element={<MachineDetail />} />
      <Route path="/machine/:id/check/:period" element={<ChecklistEntry />} />
      <Route path="/machine/:id/history" element={<History />} />
      <Route path="/machine/:id/templates" element={<TemplateBuilder />} />
      <Route path="/export" element={<Export />} />
    </Routes>
  );
}

export default App;
