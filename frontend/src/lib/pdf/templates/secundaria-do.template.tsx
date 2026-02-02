/**
 * Template de Boletín para Secundaria General - República Dominicana
 * Placeholder - En desarrollo
 */

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { BoletinData, TemplateMetadata } from '../types/boletin.types';
import {
  BaseBoletinTemplate,
  TemplateConfig,
  registerTemplate,
} from './base-template';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1a365d',
  },
  subtitle: {
    fontSize: 14,
    color: '#4a5568',
    marginBottom: 10,
  },
  message: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
    maxWidth: 400,
  },
  box: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#ebf8ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#90cdf4',
  },
  boxText: {
    fontSize: 10,
    color: '#2b6cb0',
  },
  studentInfo: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f7fafc',
    borderRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    fontWeight: 'bold',
    fontSize: 10,
    color: '#4a5568',
    width: 100,
  },
  value: {
    fontSize: 10,
    color: '#2d3748',
  },
});

/**
 * Template placeholder para Secundaria General DO
 */
export class SecundariaDoTemplate extends BaseBoletinTemplate {
  constructor(data: BoletinData, config?: Partial<TemplateConfig>) {
    super(data, config);
  }

  getMetadata(): TemplateMetadata {
    return {
      sistemaEducativo: 'SECUNDARIA_GENERAL_DO',
      nombre: 'Boletín Secundaria General',
      descripcion: 'Formato para secundaria general - En desarrollo',
      orientacion: 'portrait',
      tamañoPagina: 'LEGAL',
      paginas: 1,
    };
  }

  render(): React.ReactElement {
    const { estudiante, institucion, ciclo } = this.data;

    return (
      <Document>
        <Page size="LEGAL" style={styles.page}>
          <View style={styles.container}>
            <Text style={styles.title}>Boletín de Calificaciones</Text>
            <Text style={styles.subtitle}>Secundaria General - República Dominicana</Text>

            <View style={styles.studentInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Estudiante:</Text>
                <Text style={styles.value}>{this.getNombreCompleto()}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Institución:</Text>
                <Text style={styles.value}>{institucion.nombre}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Grado:</Text>
                <Text style={styles.value}>{estudiante.grado} - {estudiante.seccion}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Año Escolar:</Text>
                <Text style={styles.value}>{ciclo.añoEscolar}</Text>
              </View>
            </View>

            <View style={styles.box}>
              <Text style={styles.boxText}>
                Este template está en desarrollo.
              </Text>
              <Text style={[styles.boxText, { marginTop: 5 }]}>
                Próximamente se implementará el formato completo según las
                especificaciones del MINERD para secundaria general.
              </Text>
            </View>

            <Text style={[styles.message, { marginTop: 20 }]}>
              Por favor, contacte al administrador del sistema para más información
              sobre la disponibilidad de este formato.
            </Text>
          </View>
        </Page>
      </Document>
    );
  }
}

// Registrar el template
registerTemplate('SECUNDARIA_GENERAL_DO', SecundariaDoTemplate);

export default SecundariaDoTemplate;
