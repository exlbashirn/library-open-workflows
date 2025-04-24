import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AlertModule, CloudAppTranslateModule, InitService, MaterialModule } from '@exlibris/exl-cloudapp-angular-lib';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ConfigurationComponent } from './configuration/configuration.component';
import { DeleteConfirmationDialogComponent } from './configuration/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { EditDialogComponent as ConfigurationEditDialogComponent } from './configuration/edit-dialog/edit-dialog.component';
import { FormComponent } from './form/form.component';
import { MainComponent } from './main/main.component';
import { TopMenuComponent } from './top-menu/top-menu.component';
import { SettingsComponent } from './settings/settings.component';
import { EditDialogComponent as SettingsEditDialogComponent } from './settings/edit-dialog/edit-dialog.component';
import { MAT_TOOLTIP_DEFAULT_OPTIONS, MAT_TOOLTIP_DEFAULT_OPTIONS_FACTORY, MatTooltipDefaultOptions } from '@angular/material/tooltip';

export const matTooltipDefaultOptions: MatTooltipDefaultOptions = {
    ...MAT_TOOLTIP_DEFAULT_OPTIONS_FACTORY(),
    disableTooltipInteractivity: true,
  };

@NgModule({
    declarations: [
        AppComponent,
        MainComponent,
        FormComponent,
        TopMenuComponent,
        ConfigurationComponent,
        DeleteConfirmationDialogComponent,
        ConfigurationEditDialogComponent,
        SettingsComponent,
        SettingsEditDialogComponent
    ],
    bootstrap: [AppComponent],
    imports: [
        MaterialModule,
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        AlertModule,
        FormsModule,
        ReactiveFormsModule,
        CloudAppTranslateModule.forRoot()
    ],
    providers: [
        {
            provide: APP_INITIALIZER,
            useFactory: () => () => { },
            deps: [InitService],
            multi: true
        },
        provideHttpClient(withInterceptorsFromDi()),
        { provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: matTooltipDefaultOptions }
    ]
})
export class AppModule { }
