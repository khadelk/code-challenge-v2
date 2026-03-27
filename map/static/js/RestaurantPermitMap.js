import React, { useEffect, useState, useRef } from 'react';
import ReactDOMServer from 'react-dom/server';
import AreaData from './AreaData';
import AreaPopupComponent from './AreaPopup';

import { MapContainer, TileLayer, GeoJSON, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';
import '../css/legend.css';

import RAW_COMMUNITY_AREAS from '../../../data/raw/community-areas.geojson';

function YearSelect({ setFilterVal }) {
	// Filter by the permit issue year for each restaurant
	const startYear = 2026;
	const years = [...Array(11).keys()].map((increment) => {
		return startYear - increment;
	});
	const options = years.map((year) => {
		return (
			<option value={year} key={year}>
				{year}
			</option>
		);
	});

	return (
		<>
			<label htmlFor='yearSelect' className='fs-5'>
				Filter by year:{' '}
			</label>
			<select
				id='yearSelect'
				className='form-select form-select-lg mb-3'
				onChange={(e) => setFilterVal(e.target.value)}
			>
				{options}
			</select>
		</>
	);
}

export default function RestaurantPermitMap() {
	const communityAreaColors = ['#eff3ff', '#bdd7e7', '#6baed6', '#2171b5'];

	const [currentYearData, setCurrentYearData] = useState([]);
	const [year, setYear] = useState(2026);
	const [maxNumPermits, setMaxNumPermits] = useState(0);
	const [selectedAreaPermits, setSelectedAreaPermits] = useState(null);

	const yearlyDataEndpoint = `/map-data/?year=${year}`;
	const geoJsonRef = useRef(null);

	useEffect(() => {
		fetch(yearlyDataEndpoint)
			.then((res) => res.json())
			.then((data) => {
				// Fetch the data needed to supply the map
				setCurrentYearData(data);
				setMaxNumPermits(Math.max(...data.map((area) => area.num_permits)));
			});
	}, [year]);

	function getColor(numPermits) {
		// Set a community area's color using the communityAreaColors constant above
		// Determine the range of permits applied in a given year
		const minPermits = Math.min(...currentYearData.map((area) => area.num_permits));
		const maxPermits = Math.max(...currentYearData.map((area) => area.num_permits));
		const range = maxPermits - minPermits;
		// Step 2: Define dynamic ranges for each communityAreaColor
		// If there are no permits in a given year, return the lightest color
		if (range == 0) return communityAreaColors[0];

		// Get range based on percent
		// Percentage is calculated as a normalized value between 0 and 1
		const percent = (numPermits - minPermits) / range;
		if (percent <= 0) return communityAreaColors[0];
		if (percent < 0.5) return communityAreaColors[1];
		if (percent < 0.75) return communityAreaColors[2];
		return communityAreaColors[3];
	}

	const TooltipContent = (areaData) => {
		return (
			<>
				<div class='tooltip-container'>
					<span class='tooltip-title'>{areaData?.areaData?.name}</span>
					<span>Year: {year}</span>
					<span>Restaurant permits: {areaData?.areaData?.num_permits ?? 0}</span>
				</div>
			</>
		);
	};

	function setAreaInteraction(feature, layer) {
		//  Shade each community area according to what percentage of permits were issued there in the selected year
		// On hover, display a popup with the community area's raw permit count for the year
		const community = feature?.properties?.community;
		const areaData = currentYearData.find((area) => area.name == community);
		const color = getColor(areaData?.num_permits ?? 0);
		const tooltipContent = ReactDOMServer.renderToString(<TooltipContent areaData={areaData} />);
		// Bind a tooltip to the layer with options
		layer.bindTooltip(tooltipContent, {
			permanent: false, // Tooltip is not always visible
			direction: 'auto', // Position the tooltip automatically
			sticky: true, // Tooltip follows the mouse cursor
		});

		layer.setStyle({ stroke: true, fill: true, fillColor: color, color: '#666666', fillOpacity: 0.7, weight: 1 }); // this changes the styling for the entire map
		layer.on('click', async (e) => {
			// Fetch permits data for this area
			const areaId = areaData?.area_id;
			if (areaId) {
				try {
					// Show loading popup first
					const loadingContent = ReactDOMServer.renderToString(
						<AreaPopupComponent feature={feature} areaData={areaData} year={year} permitsData={null} loading={true} />
					);
					layer.bindPopup(loadingContent);
					layer.openPopup();

					const response = await fetch(`/permits-by-year/?area_id=${areaId}`);
					const permitsData = await response.json();
					setSelectedAreaPermits(permitsData);

					// Update popup with loaded data
					const popupContent = ReactDOMServer.renderToString(
						<AreaPopupComponent
							feature={feature}
							areaData={areaData}
							year={year}
							permitsData={permitsData}
							loading={false}
						/>
					);
					layer.setPopupContent(popupContent);
				} catch (error) {
					console.error('Error fetching permits data:', error);
					setSelectedAreaPermits(null);
					const errorContent = ReactDOMServer.renderToString(
						<AreaPopupComponent
							feature={feature}
							areaData={areaData}
							year={year}
							permitsData={null}
							loading={false}
							error={true}
						/>
					);
					layer.bindPopup(errorContent);
					layer.openPopup();
				}
			}

			// Set the map view to the clicked community area with a zoom level of 12
			const map = geoJsonRef.current._map;
			map.setView(e.latlng, 12);
		});
		layer.on('mouseover', (e) => {
			e.target.setStyle({
				weight: 2,
			});
			e.target.openTooltip();
		});
		layer.on('mouseout', (e) => {
			layer.setStyle({ weight: 1 });
			e.target.closeTooltip();
		});
	}

	function Legend() {
		const map = useMap();
		useEffect(() => {
			if (!map || currentYearData.length === 0) return;

			const minPermits = Math.min(...currentYearData.map((area) => area.num_permits));
			const maxPermits = Math.max(...currentYearData.map((area) => area.num_permits));
			const range = maxPermits - minPermits;

			let step1 = 0;
			let step2 = 0;
			let step3 = 0;

			if (range > 0) {
				step1 = Math.floor(minPermits + range * 0.5);
				step2 = Math.floor(minPermits + range * 0.75);
				step3 = maxPermits;
			} else {
				step1 = minPermits;
				step2 = minPermits;
				step3 = minPermits;
			}

			const legendControl = L.control({ position: 'bottomright' });
			legendControl.onAdd = () => {
				const div = L.DomUtil.create('div', 'legend');
				const r0 = `${minPermits}`;
				const r1Start = Math.max(minPermits + 1, 1);
				const r1End = Math.max(step1, r1Start);
				const r2Start = Math.max(step1 + 1, r1End + 1);
				const r2End = Math.max(step2, r2Start);
				const r3Start = Math.max(step2 + 1, r2End + 1);
				const r3End = maxPermits;

				const row0 = `<i style="background:${communityAreaColors[0]}"></i> ${r0}`;
				const row1 = `<i style="background:${communityAreaColors[1]}"></i> ${r1Start} - ${r1End}`;
				const row2 = `<i style="background:${communityAreaColors[2]}"></i> ${r2Start} - ${r2End}`;
				const row3 = `<i style="background:${communityAreaColors[3]}"></i> ${r3Start} - ${r3End}`;

				let body = `<h4>Legend</h4>`;
				body += `<p>Number of restaurant permits issued:</p>`;
				body += `<div class="legend-row">${row0}</div>`;

				if (range > 0) {
					body += `<div class="legend-row">${row1}</div>`;
					body += `<div class="legend-row">${row2}</div>`;
					body += `<div class="legend-row">${row3}</div>`;
				} else {
					body += `<div class="legend-row">${row1}</div>`;
				}

				div.innerHTML = body;
				return div;
			};

			legendControl.addTo(map);
			return () => {
				map.removeControl(legendControl);
			};
		}, [map, currentYearData]);

		return null;
	}

	return (
		<>
			<div className='map-text-container'>
				<h2>Restaurant Permits Map</h2>
				<YearSelect filterVal={year} setFilterVal={setYear} />
				<p className='fs-6'>
					<span>Restaurant permits issued this year: </span>
					{currentYearData.reduce((accumulator, currArea) => {
						const currNumPermits = currArea.num_permits || 0;
						return accumulator + currNumPermits;
					}, 0)}
				</p>
				<p className='fs-6'>
					<span>Maximum number of restaurant permits in a single area: </span>
					{maxNumPermits}
				</p>
				{/* <AreaData area={area} year={year} /> */}
			</div>
			<MapContainer id='restaurant-map' center={[41.88, -87.62]} zoom={10} zoomControl={false}>
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					url='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png'
				/>
				{currentYearData.length > 0 ? (
					<>
						<GeoJSON
							ref={geoJsonRef}
							data={RAW_COMMUNITY_AREAS}
							onEachFeature={setAreaInteraction}
							key={maxNumPermits}
						/>
						<Legend />
						<ZoomControl position='topright' />
					</>
				) : null}
			</MapContainer>
		</>
	);
}
