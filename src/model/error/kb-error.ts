export type KbErrorCode =
  | 'missing_field'
  | 'invalid_field'
  | 'unknown_op'
  | 'kb_exists'
  | 'title_exists'
  | 'kb_missing'
  | 'path_escape'
  | 'confirm_required'
  | 'quota'
  | 'ext_denied'
  | 'file_too_large'
  | 'io_failed'
  | 'read_only_format'
  | 'invalid_preview'
  | 'preview_too_large'
  | 'csv_encoding_invalid'
  | 'csv_control_character'
  | 'csv_line_too_long'
  | 'csv_parse_invalid'
  | 'csv_patch_invalid'
  | 'encoding_unsupported'
  | 'xlsx_invalid'
  | 'pdf_invalid'
  | 'not_found'

/** 知源领域层可预期的业务错误。 */
export class KbError extends Error {
  readonly code: KbErrorCode

  constructor(code: KbErrorCode, message: string) {
    super(message)
    this.name = 'KbError'
    this.code = code
  }
}
