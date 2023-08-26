import { Component } from '@angular/core';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { WayPointInterface } from 'src/app/models/waypoint.interface';
import { PaqueteService } from 'src/app/services/api/paquete.service';
import { RastreoService } from 'src/app/services/api/rastreo.service';
import { WaypointsService } from 'src/app/services/waypoints.service';

declare var google: any;

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
})
export class MapPage {

  map = null;
  mapEle: any;
  indicators: any;
  directionsService = new google.maps.DirectionsService();  // para calcular la ruta
  directionsDisplay = new google.maps.DirectionsRenderer(); // para mostrar la ruta
  marker: google.maps.Marker | null = null; // para el marcador de la ubicación actual
  locationWatchId: number | null = null; // para almacenar el id de la suscripción de watchPosition
  currentWaypointIndex: any = 0;

  origin: { lat: number, lng: number } = { lat: 0, lng: 0 };
  destination = { lat: 6.26732, lng: -75.59406 };

  entregaButton: boolean = false;

  waypoints: WayPointInterface[] = [
    { location: { lat: 6.29747, lng: -75.55033 }, stopover: true },
  ];

  paquete: any;
  uid = parseInt(localStorage.getItem('uid')!);

  constructor(
    private loading: LoadingController,
    private alert: AlertController,
    private nav: NavController,
    private waypointService: WaypointsService,
    private paqService: PaqueteService,
    private rastreoService: RastreoService
  ) { }

  ionViewDidEnter() {
    this.waypoints = this.waypointService.getWaypoints();
    console.log("nuevos way:", this.waypoints)
    this.clearCurrentLocationMarker();
    this.loadMap();
  }

  ionViewWillLeave() {
    // cancelar la suscripción de watchPosition al salir de la página
    if (this.locationWatchId !== null) {
      navigator.geolocation.clearWatch(this.locationWatchId);
    }
  }

  async loadMap() {
    this.mapEle = document.getElementById('map')!;
    this.indicators = document.getElementById('indicators')!;

    this.map = new google.maps.Map(this.mapEle, {
      center: this.origin,
      zoom: 12
    });

    this.directionsDisplay.setMap(this.map);
    this.directionsDisplay.setPanel(this.indicators);

    google.maps.event.addListenerOnce(this.map, 'idle', async () => {
      this.mapEle.classList.add('show-map');
      await this.getCurrentLocation();
      this.calculateRoute();
    });
  }

  async getCurrentLocation() {
    if (navigator.geolocation) {
      const geolocationOptions = {
        enableHighAccuracy: true, // máxima precisión posible
        timeout: 10000, // time maximo para esperar la respuesta
        maximumAge: 0 // no usar la caché de la ubicación anterior
      };

      let attempts = 0;
      const maxAttempts = 15;

      // funcion recursiva para intentar obtener la ubicacion
      const tryGetLocation = () => {
        this.locationWatchId = navigator.geolocation.watchPosition(
          (position) => {
            const currentLatLng = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };

            this.origin = currentLatLng;
            this.updateMarkerPosition(currentLatLng);

            console.log("nueva ubicación:", currentLatLng);
          },
          (error) => {
            console.warn('error al obtener la ubicación actual:', error);
            if (attempts < maxAttempts) {
              attempts++;
              console.log(`intento ${attempts} de ${maxAttempts}`);
              // intentamo obtener la ubicacion nuevamente despues de 1 segundo
              setTimeout(() => {
                tryGetLocation();
              }, 1000);
            } else {
              alert('No se pudo obtener la ubicación actual después de varios intentos.');
            }
          },
          geolocationOptions // pasamos las opciones para la geolocalizacion
        );
      };

      // llamamos la función recursiva para obtener la ubicación
      tryGetLocation();
    } else {
      console.error('El navegador no admite la geolocalización.');
      alert('El navegador no admite la geolocalización.');
    }
  }



  async calculateRoute() {
    const loading = await this.loadingAlert('Calculando la ruta...');

    let attempts = 0;
    const maxAttempts = 10;

    // funcion recursiva para intentar calcular la ruta
    const tryCalculateRoute = () => {

      this.directionsService.route({
        origin: this.origin,
        destination: this.origin,
        waypoints: this.waypoints,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING
      }, (response: any, status: any) => {

        if (status === google.maps.DirectionsStatus.OK) {
          this.directionsDisplay.setDirections(response);

          // verificar si se ha llegado a un waypoint
          const route = response.routes[0];
          const legs = route.legs;
          const currentLeg = legs[this.currentWaypointIndex];

          const waypointLatLng = this.waypoints[this.currentWaypointIndex].location;

          if (this.isCloseToWaypoint(this.origin, waypointLatLng)) {
            console.log(`Llegaste al waypoint ${this.currentWaypointIndex}`, currentLeg);
            this.currentWaypointIndex++;
            this.entregaButton = true;

            if (this.currentWaypointIndex < this.waypoints.length) {
              // si hay mas waypoints, intentamos calcular la ruta nuevamente
              tryCalculateRoute();
            } else {
              console.log('Has llegado a tu destino.');
            }
            loading.dismiss();
          } else {
            console.log('Aún no has llegado al waypoint actual.', currentLeg);
            loading.dismiss();
            setTimeout(() => {
              tryCalculateRoute();
            }, 50000000);
          }
          loading.dismiss();

        } else {
          console.warn('No se pudo calcular la ruta:', status);

          if (attempts < maxAttempts) {
            attempts++;
            console.log(`Intento ${attempts} de ${maxAttempts}`);
            setTimeout(() => {
              tryCalculateRoute();
            }, 2000);
          } else {
            alert('No se pudo calcular la ruta después de varios intentos.');
            loading.dismiss();
          }
        }
      });
    };
    tryCalculateRoute(); // llamamos la función recursiva para calcular la ruta
  }

  isCloseToWaypoint(currentLatLng: { lat: number, lng: number }, waypointLatLng: { lat: number, lng: number }): boolean {
    const proximidad = 100; // umbral de proximidad en metros

    // calculamos la distancia entre la ubicación actual y el waypoint
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(currentLatLng.lat, currentLatLng.lng),
      new google.maps.LatLng(waypointLatLng.lat, waypointLatLng.lng)
    );

    // verificamos si la distancia es menor que el umbral de proximidad
    return distance < proximidad;
  }

  openGoogleMaps() {
    let googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${this.origin.lat},${this.origin.lng}&destination=${this.origin.lat},${this.origin.lng}`;

    if (this.waypoints.length > 0) {
      const waypointsString = this.waypoints
        .map(waypoint => `${waypoint.location.lat},${waypoint.location.lng}`)
        .join('|');
      googleMapsUrl += `&waypoints=${waypointsString}`;
    }

    window.open(googleMapsUrl, '_system');
  }


  // ESTO NO SIRVE ARREGLARLO
  deliverPaquete() {
    const currentWaypoint = this.getCurrentWaypoint();
    const paqId = this.waypointService.getPackageIdFromWaypoint(currentWaypoint);

    if (paqId !== null) {
      console.log("Paquete a entregar:", paqId, currentWaypoint);

      // Pasar el ID del paquete como query parameter en la URL al navegar
      this.nav.navigateForward('/tabs/entrega', { queryParams: { paqId } });
    } else {
      console.log("No se encontró el paquete asociado al waypoint.");
    }
  }

  getCurrentWaypoint(): any {
    return this.waypoints[this.currentWaypointIndex - 1];
  }


  async reportNovedad() {
    const descAlert = await this.alert.create({
      header: 'Detalles adicionales',
      inputs: [
        {
          name: 'descripcion',
          type: 'textarea',
          placeholder: '¿Qué ha pasado?'
        }
      ],
      buttons: [
        'Cancelar',
        {
          text: 'Reportar',
          handler: async (desc: any) => {
            if (!desc.descripcion) {
              this.presentAlert('Error', 'Debes ingresar una descripción de la novedad.', 'OK');
            } else {
              await descAlert.dismiss();
              const confirmAlert = await this.alert.create({
                header: 'Confirmar reporte',
                message: 'Una vez confirmado, no podrá ser modificado o eliminado y los paquetes que no hayan sido entregados en esta ruta deberán volver a bodega, y la ruta se finalizará',
                buttons: [
                  {
                    text: 'Cancelar',
                    role: 'cancel'
                  },
                  {
                    text: 'Confirmar',
                    handler: async () => {
                      await confirmAlert.dismiss();
                      const loading = await this.loadingAlert('Guardando...');
                      try {
                        this.paqService.getPaqueteByUser(this.uid).subscribe(async (data: any) => {
                          this.paquete = data;

                          for (const paqueteItem of this.paquete) {
                            paqueteItem.idEstado = 4;

                            await this.paqService.putPaquete(paqueteItem).toPromise();

                            let getRastreo = await this.rastreoService.getRastreoByPaquete(paqueteItem.idPaquete).toPromise();

                            getRastreo!.idEstado = 2;
                            getRastreo!.motivoNoEntrega = desc.descripcion;

                            await this.rastreoService.putRastreo(getRastreo).toPromise();

                          }
                          await loading.dismiss();
                          await this.presentAlert('Novedad reportada', 'La novedad se ha reportado exitosamente.', 'Aceptar');
                        });
                      } catch (error) {
                        await loading.dismiss();
                        this.presentAlert('Error en el servidor', 'Ha ocurrido un error al reportar la novedad. Por favor, revisa tu conexión a internet o inténtalo nuevamente.', 'OK');
                        return;
                      }
                    }
                  }
                ]
              });
              await confirmAlert.present();
            }
          }
        }
      ]
    });
    await descAlert.present();
  }

  // para actualizar la posición del marcador
  updateMarkerPosition(position: { lat: number, lng: number }) {
    if (this.marker) {
      this.marker.setPosition(position);
    } else {
      this.marker = new google.maps.Marker({
        position: position,
        map: this.map,
        title: 'Mi ubicación'
      });
    }
  }

  // para limpiar el marcador de la ubicación actual
  clearCurrentLocationMarker() {
    if (this.marker) {
      this.marker.setMap(null);
      this.marker = null;
    }
  }


  goBack() {
    // limpiar el marcador de la ubicación actual cuando se navega hacia atrás
    this.clearCurrentLocationMarker();
    this.nav.navigateBack('tabs/escaner');
  }

  async presentAlert(title: string, msg: string, button: string) {
    const alert = await this.alert.create({
      header: title,
      message: msg,
      buttons: [button]
    });
    await alert.present();
  }

  async loadingAlert(msg: string) {
    const loading = await this.loading.create({
      message: msg,
      spinner: 'lines',
    });
    await loading.present();
    return loading;
  }
}
