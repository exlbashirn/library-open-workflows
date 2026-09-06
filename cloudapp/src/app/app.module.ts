import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_TOOLTIP_DEFAULT_OPTIONS, MAT_TOOLTIP_DEFAULT_OPTIONS_FACTORY, MatTooltipDefaultOptions } from '@angular/material/tooltip';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AlertModule, CloudAppTranslateModule, InitService, MaterialModule } from '@exlibris/exl-cloudapp-angular-lib';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BannerComponent } from './banner/banner.component';
import { ChatComponent } from './chat/chat.component';
import { ConfigurationComponent } from './configuration/configuration.component';
import { DeleteConfirmationDialogComponent } from './configuration/delete-confirmation-dialog/delete-confirmation-dialog.component';
import { EditDialogComponent as ConfigurationEditDialogComponent } from './configuration/edit-dialog/edit-dialog.component';
import { FormComponent } from './form/form.component';
import { MainComponent } from './main/main.component';
import { EditDialogComponent as SettingsEditDialogComponent } from './settings/edit-dialog/edit-dialog.component';
import { SettingsComponent } from './settings/settings.component';
import { EmptyListComponent } from './shared/empty-list/empty-list.component';
import { ErrorStateComponent } from './shared/error-state/error-state.component';
import { ResourceConfigListComponent } from './shared/resource-config-list/resource-config-list.component';
import { ResourceMainListComponent } from './shared/resource-main-list/resource-main-list.component';
import { ResourceTabLabelComponent } from './shared/resource-tab-label/resource-tab-label.component';
import { TopMenuComponent } from './top-menu/top-menu.component';
import { OperationStatusBannerComponent } from './shared/operation-status-banner/operation-status-banner.component';
import { IframeHostComponent } from './shared/iframe-host/iframe-host.component';

export const matTooltipDefaultOptions: MatTooltipDefaultOptions = {
    ...MAT_TOOLTIP_DEFAULT_OPTIONS_FACTORY(),
    disableTooltipInteractivity: true,
};

@NgModule({
    declarations: [
        AppComponent,
        MainComponent,
        FormComponent,
        ChatComponent,
        TopMenuComponent,
        ConfigurationComponent,
        DeleteConfirmationDialogComponent,
        ConfigurationEditDialogComponent,
        SettingsComponent,
        SettingsEditDialogComponent,
        ResourceMainListComponent,
        ResourceConfigListComponent,
        ResourceTabLabelComponent,
        ErrorStateComponent,
        BannerComponent,
        EmptyListComponent,
        OperationStatusBannerComponent,
        IframeHostComponent
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
