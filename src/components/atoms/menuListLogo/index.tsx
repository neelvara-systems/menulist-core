import Image from 'next/image';

interface MenuListLogoProps {
    color?: string;
}

export function MenuListIconLogo() {
    return (
        <Image
            alt="MenuList"
            height={40}
            priority
            src="/icons/icon-192x192.png"
            width={40}
        />
    );
}

export function MenuListHorizontalLogo({ color = 'currentColor' }: MenuListLogoProps) {
    return (
        <div
            aria-label="MenuList"
            role="img"
            style={{
                alignItems: 'center',
                color,
                display: 'flex',
                fontSize: 20,
                fontWeight: 700,
                gap: 8,
                lineHeight: 1,
                whiteSpace: 'nowrap',
            }}
        >
            <Image
                alt=""
                aria-hidden="true"
                height={34}
                priority
                src="/icons/icon-192x192.png"
                width={34}
            />
            <span>MenuList</span>
        </div>
    );
}
