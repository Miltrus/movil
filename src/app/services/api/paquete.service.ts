import { Injectable } from '@angular/core';
import { PaqueteInterface } from '../../models/paquete.interface';
import { UsuarioInterface } from '../../models/usuario.interface';
import { ClienteInterface } from '../../models/cliente.interface';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ResponseInterface } from 'src/app/models/response.interface';

@Injectable({
  providedIn: 'root'
})
export class PaqueteService {

  url: string = 'http://localhost:3030/';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    // Aquí agregamos el token a las cabeceras
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Token': token || ''
    });
  }

  getAllPaquetes(): Observable<PaqueteInterface[]> {
    let address = this.url + 'paquete';
    const headers = this.getHeaders();
    return this.http.get<PaqueteInterface[]>(address, { headers });
  }

  getOnePaquete(id: any): Observable<PaqueteInterface> {
    let address = this.url + 'paquete/' + id;
    const headers = this.getHeaders();
    return this.http.get<PaqueteInterface>(address, { headers });
  }

  getPaqueteByUser(uid: any): Observable<PaqueteInterface[]> {
    let address = this.url + 'paquete/usuario/' + uid
    const headers = this.getHeaders();
    return this.http.get<PaqueteInterface[]>(address, { headers });
  }

  getPaqueteByCodigo(codigo: any): Observable<PaqueteInterface> {
    let address = this.url + 'paquete/data/' + codigo;
    const headers = this.getHeaders();
    return this.http.get<PaqueteInterface>(address, { headers });
  }

  putPaquete(id: any): Observable<any> {
    let address = this.url + 'paquete/' + id;
    const headers = this.getHeaders();
    return this.http.put<any>(address, id, { headers });
  }

  getUsuario(): Observable<UsuarioInterface[]> {
    const address = this.url + 'usuario';
    const headers = this.getHeaders();
    return this.http.get<UsuarioInterface[]>(address, { headers });
  }

  getRemitenteAndDestinatario(): Observable<ClienteInterface[]> {
    const address = this.url + 'cliente';
    const headers = this.getHeaders();
    return this.http.get<ClienteInterface[]>(address, { headers });
  }

  getDataRemitente(idCliente: any): Observable<any> {
    const address = this.url + 'paquete/' + idCliente + '/data';
    const headers = this.getHeaders();
    return this.http.get<any>(address, { headers });
  }

  getDataDestinatario(idCliente: any): Observable<any> {
    const address = this.url + 'paquete/' + idCliente + '/data';
    const headers = this.getHeaders();
    return this.http.get<any>(address, { headers });
  }
}
