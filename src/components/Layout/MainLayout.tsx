import React from "react";
import Header from "../UI/Header";
import Footer from "../UI/Footer";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => (
  <div className="flex flex-col h-screen">
    <Header />
    <main className="flex-1 relative overflow-hidden">{children}</main>
    <Footer />
  </div>
);

export default MainLayout;
