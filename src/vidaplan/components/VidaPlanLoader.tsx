// Tela de carregamento do Vida Plan — logo Novare com animação (bob) + barra.
import logoPreta from "@/assets/logo-preta.png";

const VidaPlanLoader = ({ label = "Carregando seu projeto de vida…" }: { label?: string }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F1EA] gap-6 px-6">
    <style>{`
      @keyframes vpBob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
      @keyframes vpSlide { 0% { transform: translateX(-120%) } 100% { transform: translateX(320%) } }
      @keyframes vpFade { 0%,100% { opacity:.4 } 50% { opacity:1 } }
    `}</style>
    <img src={logoPreta} alt="Novare" className="h-11 w-auto" style={{ animation: "vpBob 1.4s ease-in-out infinite" }} />
    <div className="w-44 h-1.5 rounded-full bg-black/[0.08] overflow-hidden">
      <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#16314f] to-[#C8643F]" style={{ animation: "vpSlide 1.2s ease-in-out infinite" }} />
    </div>
    <p className="text-xs text-[#1b2a3d]/50" style={{ animation: "vpFade 1.6s ease-in-out infinite" }}>{label}</p>
  </div>
);

export default VidaPlanLoader;
