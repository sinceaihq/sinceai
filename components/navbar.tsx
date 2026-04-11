"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaDiscord, FaInstagram, FaLinkedin } from "react-icons/fa";
import { Menu } from "lucide-react";

import { Button } from "./ui/button";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "./ui/navigation-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "./ui/sheet";

import Logo from "./logo";

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const handleNavigation = (path: string) => {
    setIsMenuOpen(false);
    if (path.startsWith("http")) {
      window.open(path, "_blank");
    } else if (path.startsWith("#")) {
      const element = document.querySelector(path);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      router.push(path);
    }
  };

  const links = {
    home: "/",
    hackathon: "/hackathon",
    community: "https://discord.gg/6PC74zW68v",
    events: "/events",
    projects: "/projects",
    partners: "/partners",
    blog: "/blog",
    resources: "/resources",
    contact: "/contact",
    partner: "#partner-section",
    instagram: "https://www.instagram.com/sinceaihq",
    linkedin:
      "https://www.linkedin.com/company/sinceai/about/?viewAsMember=true",
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full glass-dark">
      <div className="flex h-[72px] items-center justify-between px-6 max-w-7xl mx-auto">
        {/* Mobile Layout */}
        <div className="flex sm:hidden items-center justify-between w-full">
          <Link href="/" className="cursor-pointer">
            <Logo />
          </Link>
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-300 hover:bg-gray-800/50"
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="bg-neutral-950/95 backdrop-blur-2xl border-white/5"
            >
              <SheetHeader>
                <SheetTitle className="text-neutral-400 text-sm font-medium">Menu</SheetTitle>
                <SheetDescription className="sr-only">
                  Navigate to different sections of Since AI website
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-1 pt-8 px-2">
                <button
                  onClick={() => handleNavigation(links.home)}
                  className="text-base font-medium text-neutral-300 hover:text-white transition-colors duration-300 cursor-pointer py-3 px-4 text-left rounded-xl hover:bg-white/5"
                >
                  Home
                </button>
                <button
                  onClick={() => handleNavigation(links.hackathon)}
                  className="text-base font-medium text-neutral-300 hover:text-white transition-colors duration-300 cursor-pointer py-3 px-4 text-left rounded-xl hover:bg-white/5"
                >
                  Hackathon
                </button>
                <button
                  onClick={() => handleNavigation(links.events)}
                  className="text-base font-medium text-neutral-300 hover:text-white transition-colors duration-300 cursor-pointer py-3 px-4 text-left rounded-xl hover:bg-white/5"
                >
                  Events
                </button>
                <button
                  onClick={() => handleNavigation(links.projects)}
                  className="text-base font-medium text-neutral-300 hover:text-white transition-colors duration-300 cursor-pointer py-3 px-4 text-left rounded-xl hover:bg-white/5"
                >
                  Projects
                </button>
                <button
                  onClick={() => handleNavigation(links.partners)}
                  className="text-base font-medium text-neutral-300 hover:text-white transition-colors duration-300 cursor-pointer py-3 px-4 text-left rounded-xl hover:bg-white/5"
                >
                  Partners
                </button>
                <button
                  onClick={() => handleNavigation(links.blog)}
                  className="text-base font-medium text-neutral-300 hover:text-white transition-colors duration-300 cursor-pointer py-3 px-4 text-left rounded-xl hover:bg-white/5"
                >
                  Blog
                </button>
                <button
                  onClick={() => handleNavigation(links.resources)}
                  className="text-base font-medium text-neutral-300 hover:text-white transition-colors duration-300 cursor-pointer py-3 px-4 text-left rounded-xl hover:bg-white/5"
                >
                  Resources
                </button>
                <button
                  onClick={() => handleNavigation(links.contact)}
                  className="text-base font-medium text-neutral-300 hover:text-white transition-colors duration-300 cursor-pointer py-3 px-4 text-left rounded-xl hover:bg-white/5"
                >
                  Contact
                </button>

                <div className="border-t border-white/5 mt-6 pt-6">
                  <button
                    onClick={() => handleNavigation(links.community)}
                    className="text-sm font-normal text-neutral-500 hover:text-neutral-300 transition-colors duration-300 cursor-pointer py-2 px-4 block text-left w-full rounded-lg hover:bg-white/5"
                  >
                    Discord
                  </button>
                  <button
                    onClick={() => handleNavigation(links.instagram)}
                    className="text-sm font-normal text-neutral-500 hover:text-neutral-300 transition-colors duration-300 cursor-pointer py-2 px-4 block text-left w-full rounded-lg hover:bg-white/5"
                  >
                    Instagram
                  </button>
                  <button
                    onClick={() => handleNavigation(links.linkedin)}
                    className="text-sm font-normal text-neutral-500 hover:text-neutral-300 transition-colors duration-300 cursor-pointer py-2 px-4 block text-left w-full rounded-lg hover:bg-white/5"
                  >
                    LinkedIn
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-center justify-between w-full">
          {/* Navigation Menu */}
          <NavigationMenu className="mx-0 px-0">
            <NavigationMenuList className="gap-4">
              {/* Logo */}
              <Link href="/" className="cursor-pointer">
                <Logo />
              </Link>

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <button
                    onClick={() => handleNavigation(links.hackathon)}
                    className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-300 text-neutral-400 hover:text-white hover:bg-white/5 bg-transparent border-none cursor-pointer"
                  >
                    Hackathon
                  </button>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <button
                    onClick={() => handleNavigation(links.events)}
                    className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-300 text-neutral-400 hover:text-white hover:bg-white/5 bg-transparent border-none cursor-pointer"
                  >
                    Events
                  </button>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <button
                    onClick={() => handleNavigation(links.projects)}
                    className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-300 text-neutral-400 hover:text-white hover:bg-white/5 bg-transparent border-none cursor-pointer"
                  >
                    Projects
                  </button>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <button
                    onClick={() => handleNavigation(links.partners)}
                    className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-300 text-neutral-400 hover:text-white hover:bg-white/5 bg-transparent border-none cursor-pointer"
                  >
                    Partners
                  </button>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <button
                    onClick={() => handleNavigation(links.blog)}
                    className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-300 text-neutral-400 hover:text-white hover:bg-white/5 bg-transparent border-none cursor-pointer"
                  >
                    Blog
                  </button>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <button
                    onClick={() => handleNavigation(links.resources)}
                    className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-300 text-neutral-400 hover:text-white hover:bg-white/5 bg-transparent border-none cursor-pointer"
                  >
                    Resources
                  </button>
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <button
                    onClick={() => handleNavigation(links.contact)}
                    className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-300 text-neutral-400 hover:text-white hover:bg-white/5 bg-transparent border-none cursor-pointer"
                  >
                    Contact
                  </button>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* CTA Button */}
          <div className="flex flex-row items-center gap-2">
            <Button
              onClick={() => handleNavigation(links.community)}
              className="text-sm px-5 py-2 rounded-full bg-white text-black font-semibold hover:bg-neutral-100 transition-all duration-300 border-none"
            >
              Join Community
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};
