import React from 'react';

export default function AreaPopupComponent({ feature, areaData, year, permitsData, loading = false, error = false }) {
	const community = feature?.properties?.community;
	return (
		<>
			<div className='tooltip-container'>
				<span className='tooltip-title'>{areaData?.areaData?.name ?? community}</span>
				<span>Year: {year}</span>
				<span>Restaurant permits: {areaData?.num_permits ?? 0}</span>
				{loading && <div>Loading permits data...</div>}
				{error && <div>Error loading permits data</div>}
				{permitsData && !loading && !error && (
					<div>
						<h5 className='tooltip-title'>Permits by Year:</h5>
						<ul>
							{permitsData.permits_by_year?.map((item) => (
								<li key={item.year}>
									{item.year}: {item.count} permits
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</>
	);
}
