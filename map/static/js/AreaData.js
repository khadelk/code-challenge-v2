import React, { useState } from 'react';

export default function AreaData({ area, year }) {
	return (
		<div>
			<h1>Area Data</h1>
			<p>Area: {area}</p>
			<p>Year: {year}</p>
		</div>
	);
}
