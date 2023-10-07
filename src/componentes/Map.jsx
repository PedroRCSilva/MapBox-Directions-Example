import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapboxGeocoding from "@mapbox/mapbox-sdk/services/geocoding";
import Card from "./Card";
import axios from "axios";

const Map = () => {
  // Chave de acesso ao Mapbox - Coloque sua chave de acesso no arquivo .env
  const API_KEY = import.meta.env.VITE_MAPBOX_TOKEN;
  const mapContainerRef = useRef(null);

  const [mapStyle, setMapStyle] = useState(
    "mapbox://styles/mapbox/streets-v11"
  );
  const geocodingClient = MapboxGeocoding({
    accessToken: API_KEY,
  });

  // Função para gerar coordenadas aleatórias
  const gerarCoordenadaAleatoria = () => {
    // Limites aproximados para a região de São Paulo
    const minLatitude = -23.950088; // Latitude sul
    const maxLatitude = -23.473297; // Latitude norte
    const minLongitude = -46.825662; // Longitude oeste
    const maxLongitude = -46.365583; // Longitude leste
    const latitude = minLatitude + Math.random() * (maxLatitude - minLatitude);
    const longitude =
      minLongitude + Math.random() * (maxLongitude - minLongitude);

    return { lat: latitude, lon: longitude };
  };

  // Estado para armazenar as coordenadas de origem
  const [originCoordinates, setOriginCoordinates] = useState(
    gerarCoordenadaAleatoria()
  );

  // Estado para armazenar as coordenadas de destino
  const [destination, setDestination] = useState(gerarCoordenadaAleatoria());

  // Estado para armazenar as coordenadas da rota
  const [routerCoordinates, setRouterCoordinates] = useState([]);

  // Função para criar o marcador
  const criarMarcador = (map, coordenada, componente) => {
    const maker = new mapboxgl.Marker();
    const popUp = new mapboxgl.Popup({ offset: 25 });
    const popUpNode = document.createElement("div");
    const portal = ReactDOM.createPortal(componente, popUpNode);
    ReactDOM.render(portal, popUpNode);
    popUp.setDOMContent(popUpNode);
    maker.setLngLat(coordenada);
    maker.setPopup(popUp);
    maker.getElement().addEventListener("click", () => {
      getRoute(originCoordinates, coordenada, map);
    });
    return maker;
  };

  // Função para buscar as rotas entre os dois pontos
  const getRoute = async (origin, destination, map) => {
    console.log(origin, destination);
    // Requisição para a API do Mapbox
    const query = await axios.get(
      `https://api.mapbox.com/directions/v5/mapbox/cycling/${origin.lon},${origin.lat};${destination.lon},${destination.lat}?geometries=geojson&access_token=${API_KEY}`
    );

    // Buscar as coordenadas da rota
    const data = query.data.routes[0];

    // Atualizar o estado com as coordenadas da rota
    const route = data.geometry.coordinates;

    // Atualizar o estado com as coordenadas da rota
    const geojson = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: route,
      },
    };

    //Se a rota já existir, atualizar, senão criar
    if (map.getSource("route")) {
      map.getSource("route").setData(geojson);
    } else {
      //Traçar linha entre os dois pontos
      map.addLayer({
        id: "route",
        type: "line",
        source: {
          type: "geojson",
          data: geojson,
        },
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#222",
          "line-width": 5,
          "line-opacity": 0.75,
        },
      });
    }
  };

  useEffect(() => {
    //Criar instância do mapa
    mapboxgl.accessToken = API_KEY;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: gerarCoordenadaAleatoria(),
      zoom: 9,
    });
    // GERAR MARCADORES ALEATÓRIOS

    // Capturar evento de carregamento do mapa
    map.on("load", () => {
      // Busca as rotas entre os dois pontos
      getRoute(originCoordinates, destination, map);

      // Gerar 10 marcadores aleatórios
      const marcadores = Array.from({ length: 10 }, () =>
        gerarCoordenadaAleatoria()
      );

      // Adicionar controle de navegação
      map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

      // Gerar marcadores baseado na função de marcadores aleatórios
      marcadores.forEach((coordenada) => {
        const maker = criarMarcador(map, coordenada, <Card />);
        maker.addTo(map);
      });

      // Adicionar marcador de destino
      map.addLayer({
        id: "origin",
        type: "circle",
        source: {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [originCoordinates.lon, originCoordinates.lat],
            },
          },
        },
        paint: {
          "circle-radius": 10,
          "circle-color": "#3887be",
        },
      });
    });
  }, [mapStyle, routerCoordinates]);

  return (
    <div>
      <div ref={mapContainerRef} className="w-screen h-screen"></div>
     
    </div>
  );
};

export default Map;
