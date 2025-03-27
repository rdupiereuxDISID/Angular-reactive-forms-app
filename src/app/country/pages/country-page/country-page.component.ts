import { JsonPipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CountryService } from '../../services/country.service';
import { filter, switchMap, tap } from 'rxjs';
import { Country } from '../../interfaces/icountry';

@Component({
  selector: 'app-country-page',
  imports: [ReactiveFormsModule, JsonPipe],
  templateUrl: './country-page.component.html',
})
export class CountryPageComponent {
  fb = inject(FormBuilder);
  countryService = inject(CountryService);

  regions = signal(this.countryService.regions);

  countriesByRegion = signal<Country[]>([]);
  borders = signal<Country[]>([]);

  myForm = this.fb.group({
    region: ['', Validators.required],
    country: ['', Validators.required],
    border: ['', Validators.required],
  });

  onFormChanged = effect((onCleanup) => {
    const regionSubscription = this.onRegionChanged();
    const countrySubscription = this.onCountryChanged();

    onCleanup(() => {
      regionSubscription.unsubscribe();
      countrySubscription.unsubscribe();
    });
  });

  onRegionChanged() {
    // Escucha el cambio en la región del formulario
    return this.myForm
      .get('region')! // Obtiene el campo de "region"
      .valueChanges.pipe(
        // Limpia los campos de "country" y "border" cuando cambia la región
        tap(() => this.myForm.get('country')!.setValue('')),
        tap(() => this.myForm.get('border')!.setValue('')),
        // Limpia las listas de fronteras y países por región
        tap(() => {
          this.borders.set([]);
          this.countriesByRegion.set([]);
        }),
        // Obtiene los países según la región seleccionada
        switchMap((region) =>
          this.countryService.getCountriesByRegion(region ?? '')
        )
      )
      // Actualiza la lista de países con los nuevos datos
      .subscribe((countries) => {
        this.countriesByRegion.set(countries);
      });
  }

  onCountryChanged() {
    // Escucha el cambio en el campo "country" del formulario
    return this.myForm
      .get('country')! // Obtiene el campo de "country"
      .valueChanges.pipe(
        // Limpia el valor del campo "border" cuando cambia el país
        tap(() => this.myForm.get('border')!.setValue('')),
        // Solo continua si el valor del país tiene longitud mayor a 0
        filter((value) => value!.length > 0),
        // Obtiene la información del país usando el código alfa del país seleccionado
        switchMap((alphaCode) =>
          this.countryService.getCountryByAlphaCode(alphaCode ?? '')
        ),
        // Usa las fronteras del país para obtener los nombres de los países fronterizos.
        // Cambiar la información de un país por la lista de países fronterizos de ese país.
        switchMap((country) =>
          this.countryService.getCountryNamesByCodeArray(country.borders)
        )
      )
      // Actualiza la lista de fronteras con los países encontrados
      .subscribe((borders) => {
        this.borders.set(borders);
      });
  }
}
