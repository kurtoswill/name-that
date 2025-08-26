'use client';

import { Plus } from "lucide-react";
import { BiHomeAlt2 } from "react-icons/bi";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const pathname = usePathname();

    // Don't show navbar on create page
    if (pathname === '/create') {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 border-t border-[#E4A2B1]">
            <div className="flex items-center justify-center px-6 py-4 pb-7">
                <ul className="flex items-center space-x-14">
                    <li>
                        <Link href="/">
                            <BiHomeAlt2 color="#E4A2B1" size="30"/>
                        </Link>
                    </li>
                    <li>
                        <Link href="/create">
                            <div className="rounded-full bg-[#FBE2A7] p-2">
                                <Plus color="#12242E"/>
                            </div>
                        </Link>
                    </li>
                    <li>
                        <Link href="/leaderboards">
                            <svg xmlns="http://www.w3.org/2000/svg" height="30px" viewBox="0 -960 960 960" width="30px" fill="#E4A2B1">
                                <path d="M160-200h160v-320H160v320Zm240 0h160v-560H400v560Zm240 0h160v-240H640v240ZM80-120v-480h240v-240h320v320h240v400H80Z"/>
                            </svg>
                        </Link>
                    </li>
                </ul>
            </div>
        </div>
    );
}