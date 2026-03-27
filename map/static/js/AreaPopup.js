import React from 'react';

export default function AreaPopupComponent({ feature, areaData, year, permitsData, loading = false, error = false }) {
	const community = feature?.properties?.community;

	const BarChart = ({ permitsData, year }) => {
		const data = permitsData?.permits_by_year;
		return (
			<div className='chart-container'>
				<div className='y-axis-label'>Permits</div>
				<div className='chart-wrapper'>
					<div id='bar-chart' className='chart'>
						{data.map((item) => (
							<div key={item.year} className='bar-item'>
								<div className='bar-label'>{item.count}</div>
								<div className='bar' style={{ height: `${item.count * 1.5}%` }}></div>
							</div>
						))}
					</div>
					<div className='x-axis-labels'>
						{data.map((item) => (
							<div key={item.year} className='x-axis-label'>
								{item.year}
							</div>
						))}
					</div>
				</div>
			</div>
		);
	};

	return (
		<>
			<div className='popup-container'>
				<h5 className='popup-title'>{areaData?.areaData?.name ?? community}</h5>
				<span>Year: {year}</span>

				<span>Restaurant permits: {areaData?.num_permits ?? 0}</span>

				{loading && <div>Loading permits data...</div>}
				{error && <div>Error loading permits data</div>}
				{permitsData && !loading && !error && (
					<div>
						<h6 className='popup-title permits'>Permits Issued by Year</h6>
						<BarChart key={year} permitsData={permitsData} year={year} />
					</div>
				)}
			</div>
		</>
	);
}
