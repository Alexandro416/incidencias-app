import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Distrito, DistritoRequest } from '../models/models';
import { handleHttpError } from '../utils/error.util';

@Injectable({ providedIn: 'root' })
export class DistritoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/distritos`;
  private readonly adminUrl = `${environment.apiUrl}/admin/distritos`;

  /** GET /api/distritos (cualquier usuario autenticado). */
  listar(): Observable<Distrito[]> {
    return this.http.get<Distrito[]>(this.url).pipe(catchError(handleHttpError));
  }

  // ---------- ADMIN ----------
  crear(req: DistritoRequest): Observable<Distrito> {
    return this.http.post<Distrito>(this.adminUrl, req).pipe(catchError(handleHttpError));
  }

  actualizar(id: number, req: DistritoRequest): Observable<Distrito> {
    return this.http.put<Distrito>(`${this.adminUrl}/${id}`, req).pipe(catchError(handleHttpError));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminUrl}/${id}`).pipe(catchError(handleHttpError));
  }
}
