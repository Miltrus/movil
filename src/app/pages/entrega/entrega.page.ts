import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import SignaturePad from 'signature_pad';
import { EntregaInterface } from 'src/app/models/entrega.interface';
import { ListaPaquetesInterface } from 'src/app/models/lista-paquetes.interface';
import { EntregaService } from 'src/app/services/api/entrega.service';
import { PaqueteService } from 'src/app/services/api/paquete.service';

@Component({
  selector: 'app-entrega',
  templateUrl: './entrega.page.html',
  styleUrls: ['./entrega.page.scss'],
})
export class EntregaPage {

  @ViewChild('canvas', { static: true }) signaturePadElement?: ElementRef;

  signaturePad: any;

  newForm: FormGroup;
  listaPaquetes: ListaPaquetesInterface[] = [];
  paqId: any;
  paquete: any;

  constructor(
    private api: EntregaService,
    private alert: AlertController,
    private loading: LoadingController,
    private formBuilder: FormBuilder,
    private nav: NavController,
    private elementRef: ElementRef,
    private route: ActivatedRoute,
    private paqService: PaqueteService
  ) {
    this.newForm = this.formBuilder.group({
      firmaDestinatario: [''],
      fechaEntrega: [''],
      idLista: [21]
    });
  }

  async ngOnInit() {
    const loading = await this.loading.create({
      message: 'Cargando...',
      spinner: 'lines'
    });
    await loading.present();

    this.route.queryParams.subscribe(params => {
      this.paqId = params['paqId'];
      this.paqService.getOnePaquete(this.paqId).subscribe(data => {
        this.paquete = data;
        loading.dismiss();
      });
      return this.paqId;
    });
  }


  async save(): Promise<void> {
    this.saveSignature();
    const confirmAlert = await this.alert.create({
      header: 'Confirmar entrega',
      message: '¿Está seguro de que deseas confirmar la entrega?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: async () => {
            this.dateAndTime();
            const entregaData: EntregaInterface = this.newForm.value;
            console.log("POST: ", entregaData);
            await confirmAlert.dismiss();
            const loading = await this.loading.create({
              message: 'Guardando...',
              spinner: 'lines'
            });
            await loading.present();
            this.paquete.idEstado = 3
            this.paqService.putPaquete(this.paquete).subscribe(async data => {
              console.log(data)
              if (data?.status == 'ok') {
                await loading.dismiss();
                this.nav.navigateRoot('/tabs/tab1');
                this.clearCanvas();
                const successAlert = await this.alert.create({
                  header: 'Entrega exitosa',
                  message: 'La entrega se ha confirmado correctamente.',
                  buttons: ['Aceptar'],
                });
                await successAlert.present();
              } else {
                await loading.dismiss();
                const errorAlert = await this.alert.create({
                  header: 'Error',
                  message: data?.msj,
                  buttons: ['OK'],
                });
                await errorAlert.present();
              }
            });

            /* try {
              const data = await this.api.postEntrega(entregaData).toPromise();
              if (data?.status == 'ok') {
                await loading.dismiss();
                this.nav.navigateRoot('/tabs/tab1');
                this.clearCanvas();
                const successAlert = await this.alert.create({
                  header: 'Entrega exitosa',
                  message: 'La entrega se ha confirmado correctamente.',
                  buttons: ['OK'],
                });
                await successAlert.present();
              } else {
                await loading.dismiss();
                const errorAlert = await this.alert.create({
                  header: 'Error',
                  message: data?.msj,
                  buttons: ['OK'],
                });
                await errorAlert.present();
              }
            } catch (error) {
              await loading.dismiss();
              const errorAlert = await this.alert.create({
                header: 'Error en el servidor',
                message: 'Ha ocurrido un error al confirmar la entrega. Por favor, inténtalo nuevamente.',
                buttons: ['OK'],
              });
              await errorAlert.present();
            } finally {
              await loading.dismiss();
            } */
          },
        },
      ],
    });
    await confirmAlert.present();
  }

  init() {
    const canvas: any = this.elementRef.nativeElement.querySelector('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 140;
    console.log(canvas.width, ' -- ', canvas.height);

    if (this.signaturePad) {
      this.signaturePad.clear();
    }
  }

  public ngAfterViewInit(): void {
    this.signaturePad = new SignaturePad(this.signaturePadElement?.nativeElement, {
      penColor: 'rgb(0,0,0)',
      backgroundColor: 'rgb(255,255,255)'
    });
    this.signaturePad.clear();
  }

  dateAndTime() {
    const fechaActual = new Date();
    const formattedFechaEntrega = `${fechaActual.getFullYear()}-${(fechaActual.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${fechaActual.getDate().toString().padStart(2, '0')} ${fechaActual.getHours().toString().padStart(2, '0')}:${fechaActual.getMinutes().toString().padStart(2, '0')}:${fechaActual.getSeconds().toString().padStart(2, '0')}`;

    this.newForm.patchValue({
      fechaEntrega: formattedFechaEntrega,
    });

    console.log("VIDA HP", this.newForm.value.fechaEntrega);
  }

  saveSignature() {
    const dataURL = this.signaturePad.toDataURL('image/png');
    this.newForm.patchValue({
      firmaDestinatario: dataURL,
    });
    console.log(this.newForm.value);
    /* const blob = this.convertBase64toBlob(dataURL);
    console.log(blob); */
  }

  /* convertBase64toBlob(dataURL: any): Blob {
    const base64Prefix = 'data:image/png;base64,';
    const base64Data = dataURL.substring(base64Prefix.length);

    const byteCharacters = atob(base64Data);
    const byteArrays = new Uint8Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays[i] = byteCharacters.charCodeAt(i);
    }

    const blob = new Blob([byteArrays], { type: 'image/png' });
    return blob;
  } */

  isCanvasBlank(): boolean {
    if (this.signaturePad) {
      return this.signaturePad.isEmpty() ? true : false;
    } else {
      return false;
    }
  }

  clearCanvas() {
    this.signaturePad.clear();
  }

  goBack() {
    this.nav.back();
  }
}
