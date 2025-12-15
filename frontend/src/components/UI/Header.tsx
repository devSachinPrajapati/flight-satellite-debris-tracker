import { Satellite } from "lucide-react";

const Header = () => {
  return (
    <header className="bg-gray-800 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center space-x-3">
          <Satellite size={32} className="text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold">
              Real-Time Flight & Satellite Tracker
            </h1>
            <p className="text-sm text-gray-400">
              Live visualization of aircraft, satellites, and space debris
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
