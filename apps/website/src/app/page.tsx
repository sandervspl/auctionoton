import * as i from 'types';
import * as React from 'react';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { fetchUser } from 'queries/user';

type Props = i.NextPageProps;

export const metadata: Metadata = {
	title: 'Home',
};

const Page: React.FC<Props> = async () => {
	const user = await fetchUser('123-456-789');

	return (
		<main>
			<section className="grid place-items-center px-2">
				<button
					type="button"
					className="flex items-center justify-center gap-2 rounded-md border-2 border-gray-600 bg-gray-100 px-4 py-3 font-bold shadow-lg"
				>
					Auctionoton
				</button>
			</section>
		</main>
	);
};

export default Page;
