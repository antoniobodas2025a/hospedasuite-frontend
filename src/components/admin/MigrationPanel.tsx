'use client';

import { useState } from 'react';
import { dryRunMigration, migrateExistingHotelImages, type MigrationResult } from '@/app/actions/migrate-hotel-images';

export default function MigrationPanel() {
  const [isDryRunning, setIsDryRunning] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<MigrationResult | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleDryRun = async () => {
    setIsDryRunning(true);
    setDryRunResult(null);
    try {
      const result = await dryRunMigration();
      setDryRunResult(result);
    } catch (error) {
      console.error('Error en dry run:', error);
    } finally {
      setIsDryRunning(false);
    }
  };

  const handleMigrate = async () => {
    setIsMigrating(true);
    setMigrationResult(null);
    setShowConfirmDialog(false);
    try {
      const result = await migrateExistingHotelImages();
      setMigrationResult(result);
    } catch (error) {
      console.error('Error en migración:', error);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950">
        <h2 className="text-xl font-bold mb-2">Migración de Imágenes de Hoteles</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Esta herramienta migra las imágenes existentes de los hoteles desde el campo <code>gallery_urls</code> 
          hacia la nueva tabla <code>hotel_images</code> con categorías asignadas automáticamente.
        </p>
        <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
          <strong>Nota:</strong> Las categorías se infieren del nombre del archivo. 
          Las imágenes que no coincidan con ningún patrón se asignarán a la categoría "otros".
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-4">
        <button
          onClick={handleDryRun}
          disabled={isDryRunning || isMigrating}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDryRunning ? 'Ejecutando...' : '1. Dry Run (Simulación)'}
        </button>

        <button
          onClick={() => setShowConfirmDialog(true)}
          disabled={!dryRunResult || isMigrating}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isMigrating ? 'Migrando...' : '2. Ejecutar Migración'}
        </button>
      </div>

      {/* Diálogo de confirmación */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-bold mb-4">Confirmar Migración</h3>
            <p className="mb-4">
              ¿Estás seguro de que deseas ejecutar la migración? Esta acción:
            </p>
            <ul className="list-disc list-inside mb-4 text-sm">
              <li>Procesará {dryRunResult?.hotelsProcessed || 0} hoteles</li>
              <li>Migrará {dryRunResult?.imagesMigrated || 0} imágenes</li>
              <li>Mantendrá los datos originales en gallery_urls</li>
            </ul>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={handleMigrate}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resultados del Dry Run */}
      {dryRunResult && (
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
          <h3 className="text-lg font-bold mb-3">Resultados del Dry Run</h3>
          
          {dryRunResult.success ? (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Hoteles a procesar</div>
                  <div className="text-2xl font-bold">{dryRunResult.hotelsProcessed}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Imágenes a migrar</div>
                  <div className="text-2xl font-bold">{dryRunResult.imagesMigrated}</div>
                </div>
              </div>

              {dryRunResult.details.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Detalle por hotel:</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {dryRunResult.details.map((detail) => (
                      <div key={detail.hotelId} className="border rounded p-3 bg-white dark:bg-gray-800">
                        <div className="font-medium">{detail.hotelName}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {detail.imagesCount} imágenes
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {Object.entries(detail.categories).map(([category, count]) => 
                            count > 0 ? (
                              <span 
                                key={category} 
                                className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                              >
                                {category}: {count}
                              </span>
                            ) : null
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-red-600 dark:text-red-400">
              <strong>Error:</strong> {dryRunResult.errors[0]?.error}
            </div>
          )}
        </div>
      )}

      {/* Resultados de la Migración */}
      {migrationResult && (
        <div className={`border rounded-lg p-4 ${migrationResult.success ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
          <h3 className="text-lg font-bold mb-3">
            {migrationResult.success ? '✅ Migración Completada' : '❌ Migración con Errores'}
          </h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Hoteles procesados</div>
              <div className="text-2xl font-bold">{migrationResult.hotelsProcessed}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Imágenes migradas</div>
              <div className="text-2xl font-bold">{migrationResult.imagesMigrated}</div>
            </div>
          </div>

          {migrationResult.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2 text-red-600 dark:text-red-400">Errores:</h4>
              <div className="space-y-1">
                {migrationResult.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-600 dark:text-red-400">
                    Hotel {error.hotelId}: {error.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {migrationResult.details.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Detalle por hotel:</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {migrationResult.details.map((detail) => (
                  <div key={detail.hotelId} className="border rounded p-3 bg-white dark:bg-gray-800">
                    <div className="font-medium">{detail.hotelName}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {detail.imagesCount} imágenes migradas
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {Object.entries(detail.categories).map(([category, count]) => 
                        count > 0 ? (
                          <span 
                            key={category} 
                            className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs"
                          >
                            {category}: {count}
                          </span>
                        ) : null
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
