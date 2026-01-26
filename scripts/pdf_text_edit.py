#!/usr/bin/env python3
"""
PDF Text Editor using PyMuPDF (fitz)
This script provides true text editing capabilities - actually removing and replacing text,
not just covering it with white rectangles.

Usage:
    python pdf_text_edit.py <input_pdf> <output_pdf> <edits_json>
    
    edits_json format:
    {
        "edits": [
            {
                "page": 1,
                "original_text": "old text",
                "new_text": "new text",
                "x": 100,
                "y": 200,
                "width": 150,
                "height": 20,
                "font_size": 12,
                "font_name": "helv"
            }
        ]
    }
"""

import sys
import json
import os

# Suppress MuPDF warnings by redirecting stderr during import
# and setting environment variable
os.environ['PYMUPDF_QUIET'] = '1'

import fitz  # PyMuPDF

# Suppress MuPDF messages
fitz.TOOLS.mupdf_display_errors(False)


def get_font_name(font_family: str) -> str:
    """Map font family names to PyMuPDF font names."""
    font_map = {
        # Helvetica/Arial family
        'helvetica': 'helv',
        'arial': 'helv',
        'arialmt': 'helv',
        'sans-serif': 'helv',
        
        # Times family
        'times': 'tiro',
        'times-roman': 'tiro',
        'timesnewroman': 'tiro',
        'timesnewromanpsmt': 'tiro',
        'serif': 'tiro',
        
        # Courier family
        'courier': 'cour',
        'couriernew': 'cour',
        'monospace': 'cour',
        
        # Symbol
        'symbol': 'symb',
        'zapfdingbats': 'zadb',
    }
    
    normalized = font_family.lower().replace(' ', '').replace('-', '').replace('_', '')
    return font_map.get(normalized, 'helv')


def get_form_fields(input_path: str) -> dict:
    """
    Extract all form fields from a PDF.
    
    Args:
        input_path: Path to input PDF
        
    Returns:
        dict with form fields info
    """
    try:
        doc = fitz.open(input_path)
        fields = []
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Get all widgets (form fields) on the page
            for widget in page.widgets():
                field_info = {
                    'name': widget.field_name or f'field_{page_num}_{len(fields)}',
                    'type': get_field_type_name(widget.field_type),
                    'type_code': widget.field_type,
                    'value': widget.field_value or '',
                    'page': page_num + 1,
                    'rect': list(widget.rect),  # [x0, y0, x1, y1]
                    'flags': widget.field_flags,
                    'is_read_only': bool(widget.field_flags & 1),  # ReadOnly flag
                }
                
                # For choice fields (dropdown/listbox), get options
                if widget.field_type in [fitz.PDF_WIDGET_TYPE_LISTBOX, fitz.PDF_WIDGET_TYPE_COMBOBOX]:
                    field_info['options'] = widget.choice_values or []
                
                # For checkbox/radio, get the export value
                if widget.field_type in [fitz.PDF_WIDGET_TYPE_CHECKBOX, fitz.PDF_WIDGET_TYPE_RADIOBUTTON]:
                    field_info['is_checked'] = widget.field_value == widget.on_state() if widget.on_state() else False
                
                fields.append(field_info)
        
        doc.close()
        
        return {
            'success': True,
            'fields': fields,
            'field_count': len(fields)
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'fields': []
        }


def get_field_type_name(field_type: int) -> str:
    """Convert field type code to human-readable name."""
    type_names = {
        fitz.PDF_WIDGET_TYPE_BUTTON: 'button',
        fitz.PDF_WIDGET_TYPE_CHECKBOX: 'checkbox',
        fitz.PDF_WIDGET_TYPE_RADIOBUTTON: 'radio',
        fitz.PDF_WIDGET_TYPE_TEXT: 'text',
        fitz.PDF_WIDGET_TYPE_LISTBOX: 'listbox',
        fitz.PDF_WIDGET_TYPE_COMBOBOX: 'combobox',
        fitz.PDF_WIDGET_TYPE_SIGNATURE: 'signature',
    }
    return type_names.get(field_type, 'unknown')


def fill_form_fields(input_path: str, output_path: str, field_values: list) -> dict:
    """
    Fill form fields in a PDF.
    
    Args:
        input_path: Path to input PDF
        output_path: Path to save filled PDF
        field_values: List of {name: str, value: str} dicts
        
    Returns:
        dict with status and any errors
    """
    import tempfile
    import shutil
    
    try:
        doc = fitz.open(input_path)
        fields_filled = 0
        errors = []
        
        # Create a mapping of field names to new values
        value_map = {f['name']: f['value'] for f in field_values}
        
        for page in doc:
            for widget in page.widgets():
                field_name = widget.field_name
                
                if field_name in value_map:
                    new_value = value_map[field_name]
                    
                    try:
                        # Handle different field types
                        if widget.field_type == fitz.PDF_WIDGET_TYPE_CHECKBOX:
                            # For checkbox, value should be 'true'/'false' or 'Yes'/'Off'
                            if new_value.lower() in ['true', 'yes', '1', 'on']:
                                widget.field_value = widget.on_state() or 'Yes'
                            else:
                                widget.field_value = 'Off'
                        elif widget.field_type == fitz.PDF_WIDGET_TYPE_RADIOBUTTON:
                            widget.field_value = new_value
                        else:
                            widget.field_value = new_value
                        
                        widget.update()
                        fields_filled += 1
                    except Exception as e:
                        errors.append(f"Failed to fill field '{field_name}': {str(e)}")
        
        # Handle saving
        same_file = os.path.normpath(os.path.abspath(input_path)) == os.path.normpath(os.path.abspath(output_path))
        
        if same_file:
            temp_fd, temp_path = tempfile.mkstemp(suffix='.pdf')
            os.close(temp_fd)
            try:
                doc.save(temp_path, garbage=4, deflate=True)
                doc.close()
                shutil.move(temp_path, output_path)
            except Exception as e:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                raise e
        else:
            doc.save(output_path, garbage=4, deflate=True)
            doc.close()
        
        return {
            'success': True,
            'fields_filled': fields_filled,
            'errors': errors
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'fields_filled': 0
        }


def edit_pdf_text(input_path: str, output_path: str, edits: list) -> dict:
    """
    Edit PDF text using PyMuPDF's redaction feature.
    This truly removes old text and replaces it with new text.
    
    Args:
        input_path: Path to input PDF
        output_path: Path to save edited PDF
        edits: List of text edits to apply
        
    Returns:
        dict with status and any errors
    """
    import os
    import tempfile
    import shutil
    
    try:
        doc = fitz.open(input_path)
        edits_applied = 0
        errors = []
        
        for edit in edits:
            page_num = edit.get('page', 1) - 1  # Convert to 0-indexed
            
            if page_num < 0 or page_num >= len(doc):
                errors.append(f"Invalid page number: {edit.get('page')}")
                continue
            
            page = doc[page_num]
            
            # Get edit parameters
            original_text = edit.get('original_text', '')
            new_text = edit.get('new_text', '')
            x = edit.get('x', 0)
            y = edit.get('y', 0)
            width = edit.get('width', 100)
            height = edit.get('height', 20)
            font_size = edit.get('font_size', 11)
            font_family = edit.get('font_name', 'helv')
            
            # Convert font family to PyMuPDF font name
            font_name = get_font_name(font_family)
            
            # Method 1: Try to find and replace text by searching
            if original_text:
                text_instances = page.search_for(original_text)
                
                if text_instances:
                    for rect in text_instances:
                        # Add redaction annotation - this marks text for removal
                        page.add_redact_annot(
                            rect,
                            text=new_text,
                            fontsize=font_size,
                            fontname=font_name,
                            fill=(1, 1, 1),  # White background
                            text_color=(0, 0, 0),  # Black text
                        )
                    edits_applied += 1
                else:
                    # Method 2: Use coordinates if text search fails
                    # Create rect from provided coordinates
                    # Note: PyMuPDF uses top-left origin, PDF uses bottom-left
                    # The coordinates should already be converted by the frontend
                    rect = fitz.Rect(x, y, x + width, y + height)
                    
                    page.add_redact_annot(
                        rect,
                        text=new_text,
                        fontsize=font_size,
                        fontname=font_name,
                        fill=(1, 1, 1),
                        text_color=(0, 0, 0),
                    )
                    edits_applied += 1
            else:
                # No original text provided, use coordinates
                rect = fitz.Rect(x, y, x + width, y + height)
                
                page.add_redact_annot(
                    rect,
                    text=new_text,
                    fontsize=font_size,
                    fontname=font_name,
                    fill=(1, 1, 1),
                    text_color=(0, 0, 0),
                )
                edits_applied += 1
        
        # Apply all redactions - this actually removes the original content
        for page in doc:
            page.apply_redactions()
        
        # Handle saving - if input == output, we need to save to a temp file first
        same_file = os.path.normpath(os.path.abspath(input_path)) == os.path.normpath(os.path.abspath(output_path))
        
        if same_file:
            # Save to a temporary file first, then replace the original
            temp_fd, temp_path = tempfile.mkstemp(suffix='.pdf')
            os.close(temp_fd)
            try:
                doc.save(temp_path, garbage=4, deflate=True)
                doc.close()
                # Replace the original file with the temp file
                shutil.move(temp_path, output_path)
            except Exception as e:
                # Clean up temp file on error
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                raise e
        else:
            # Different files, save directly
            doc.save(output_path, garbage=4, deflate=True)
            doc.close()
        
        return {
            'success': True,
            'edits_applied': edits_applied,
            'errors': errors
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'edits_applied': 0
        }


def main():
    # Redirect stdout temporarily to capture any stray output
    import io
    from contextlib import redirect_stdout, redirect_stderr
    
    # Capture any stray output during processing
    captured_output = io.StringIO()
    captured_errors = io.StringIO()
    
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'Usage: pdf_text_edit.py <command> [args...]'
        }))
        sys.exit(1)
    
    command = sys.argv[1]
    
    # Handle different commands
    if command == 'get_fields':
        # Get form fields: pdf_text_edit.py get_fields <input_pdf>
        if len(sys.argv) < 3:
            print(json.dumps({
                'success': False,
                'error': 'Usage: pdf_text_edit.py get_fields <input_pdf>'
            }))
            sys.exit(1)
        
        input_path = sys.argv[2]
        
        with redirect_stdout(captured_output), redirect_stderr(captured_errors):
            result = get_form_fields(input_path)
    
    elif command == 'fill_fields':
        # Fill form fields: pdf_text_edit.py fill_fields <input_pdf> <output_pdf> <fields_json>
        if len(sys.argv) < 5:
            print(json.dumps({
                'success': False,
                'error': 'Usage: pdf_text_edit.py fill_fields <input_pdf> <output_pdf> <fields_json>'
            }))
            sys.exit(1)
        
        input_path = sys.argv[2]
        output_path = sys.argv[3]
        fields_json = sys.argv[4]
        
        try:
            fields_data = json.loads(fields_json)
            field_values = fields_data.get('fields', [])
        except json.JSONDecodeError as e:
            print(json.dumps({
                'success': False,
                'error': f'Invalid JSON: {str(e)}'
            }))
            sys.exit(1)
        
        with redirect_stdout(captured_output), redirect_stderr(captured_errors):
            result = fill_form_fields(input_path, output_path, field_values)
    
    elif command == 'edit_text':
        # Edit text: pdf_text_edit.py edit_text <input_pdf> <output_pdf> <edits_json>
        if len(sys.argv) < 5:
            print(json.dumps({
                'success': False,
                'error': 'Usage: pdf_text_edit.py edit_text <input_pdf> <output_pdf> <edits_json>'
            }))
            sys.exit(1)
        
        input_path = sys.argv[2]
        output_path = sys.argv[3]
        edits_json = sys.argv[4]
        
        try:
            edits_data = json.loads(edits_json)
            edits = edits_data.get('edits', [])
        except json.JSONDecodeError as e:
            print(json.dumps({
                'success': False,
                'error': f'Invalid JSON: {str(e)}'
            }))
            sys.exit(1)
        
        with redirect_stdout(captured_output), redirect_stderr(captured_errors):
            result = edit_pdf_text(input_path, output_path, edits)
    
    else:
        # Legacy mode: assume old format for backward compatibility
        # pdf_text_edit.py <input_pdf> <output_pdf> <edits_json>
        if len(sys.argv) < 4:
            print(json.dumps({
                'success': False,
                'error': 'Usage: pdf_text_edit.py <command> [args...] or pdf_text_edit.py <input_pdf> <output_pdf> <edits_json>'
            }))
            sys.exit(1)
        
        input_path = sys.argv[1]
        output_path = sys.argv[2]
        edits_json = sys.argv[3]
        
        try:
            edits_data = json.loads(edits_json)
            edits = edits_data.get('edits', [])
        except json.JSONDecodeError as e:
            print(json.dumps({
                'success': False,
                'error': f'Invalid JSON: {str(e)}'
            }))
            sys.exit(1)
        
        with redirect_stdout(captured_output), redirect_stderr(captured_errors):
            result = edit_pdf_text(input_path, output_path, edits)
    
    # Log any captured messages to stderr (not stdout)
    stray_stdout = captured_output.getvalue()
    stray_stderr = captured_errors.getvalue()
    if stray_stdout:
        print(f"[PyMuPDF stdout]: {stray_stdout}", file=sys.stderr)
    if stray_stderr:
        print(f"[PyMuPDF stderr]: {stray_stderr}", file=sys.stderr)
    
    # Only print JSON result to stdout
    print(json.dumps(result))
    
    if not result.get('success', False):
        sys.exit(1)


if __name__ == '__main__':
    main()
