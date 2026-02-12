export {
  generateSlug,
  createInstitucion,
  findInstituciones,
  findInstitucionById,
  updateInstitucion,
  deleteInstitucion,
} from './crud.service';
export {
  getInstitucionBranding,
  getInstitucionBrandingBySlug,
  getInstitucionBrandingByDominio,
} from './branding.service';
export {
  updateInstitucionConfig,
  updateSensitiveConfig,
  checkSlugAvailability,
  checkDominioAvailability,
} from './config.service';
export { updateSistemasEducativos, seedMateriasOficiales } from './educacion.service';
