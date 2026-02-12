export {
  createInstitucionHandler,
  findInstitucionesHandler,
  findInstitucionByIdHandler,
  updateInstitucionHandler,
  deleteInstitucionHandler,
} from './crud.controller';
export {
  getBrandingHandler,
  updateConfigHandler,
  updateDirectorConfigHandler,
  getBrandingBySlugHandler,
  getBrandingByDominioHandler,
  updateSensitiveConfigHandler,
  checkSlugHandler,
  checkDominioHandler,
  updateSistemasEducativosHandler,
} from './config.controller';
export {
  uploadFaviconHandler,
  uploadHeroHandler,
  uploadLoginLogoHandler,
} from './upload.controller';
