/**
 * Template de Boletín para Secundaria - Haití
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
    color: '#2b6cb0',
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
 * Template placeholder para Secundaria Haití
 */
export class SecundariaHtTemplate extends BaseBoletinTemplate {
  constructor(data: BoletinData, config?: Partial<TemplateConfig>) {
    super(data, {
      ...config,
      locale: 'fr', // Francés por defecto para Haití
    });
  }

  getMetadata(): TemplateMetadata {
    return {
      sistemaEducativo: 'SECUNDARIA_HT',
      nombre: 'Bulletin Scolaire - Secondaire',
      descripcion: 'Format pour l\'école secondaire - En développement',
      orientacion: 'portrait',
      tamañoPagina: 'A4',
      paginas: 1,
    };
  }

  render(): React.ReactElement {
    const { estudiante, institucion, ciclo } = this.data;

    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.container}>
            <Text style={styles.title}>Bulletin Scolaire</Text>
            <Text style={styles.subtitle}>École Secondaire - Haïti</Text>

            <View style={styles.studentInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Élève:</Text>
                <Text style={styles.value}>{this.getNombreCompleto()}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Institution:</Text>
                <Text style={styles.value}>{institucion.nombre}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Classe:</Text>
                <Text style={styles.value}>{estudiante.grado} - {estudiante.seccion}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Année Scolaire:</Text>
                <Text style={styles.value}>{ciclo.añoEscolar}</Text>
              </View>
            </View>

            <View style={styles.box}>
              <Text style={styles.boxText}>
                Ce modèle est en cours de développement.
              </Text>
              <Text style={[styles.boxText, { marginTop: 5 }]}>
                Le format complet sera bientôt disponible selon les
                spécifications du Ministère de l'Éducation d'Haïti.
              </Text>
            </View>

            <Text style={[styles.message, { marginTop: 20 }]}>
              Veuillez contacter l'administrateur du système pour plus d'informations
              sur la disponibilité de ce format.
            </Text>
          </View>
        </Page>
      </Document>
    );
  }
}

// Registrar el template
registerTemplate('SECUNDARIA_HT', SecundariaHtTemplate);

export default SecundariaHtTemplate;
