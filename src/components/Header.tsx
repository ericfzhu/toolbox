import Image from 'next/image';
import Link from 'next/link';

export default function Header() {
	return (
		<Link href="/" className="uppercase text-xl font-semibold w-fit flex gap-2 items-center">
			<Image src="/icon.svg" alt="" width={32} height={32} className="h-8 w-8" priority />
			Toolbox
		</Link>
	);
}
