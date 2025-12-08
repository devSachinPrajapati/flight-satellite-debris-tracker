const Footer = () => { 
  return (
    <footer className="bg-gray-800 text-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-center space-x-12 text-sm">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
            <span>Aircraft</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
            <span>Satellites</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
            <span>Space Debris</span>
          </div>
          <span className="text-gray-400">|</span>
          <span className="text-gray-400">Click any marker for details</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;