import React from "react";
interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <>
      
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/assets/logo/SINCE AI white.png"
        className={className ? className : "w-auto h-[28px]"}
        alt="Since AI — Global AI builders community logo"
        width={28}
        height={28}
      />
    </>
  );
};

export default Logo;
