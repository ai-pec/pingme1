import Navbar from "@/components/Navbar";
import FooterNew from "@/components/FooterNew";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <FooterNew />
    </div>
  );
};

export default MainLayout;
